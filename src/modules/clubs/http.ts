import "server-only";
import { randomUUID } from "node:crypto";
import { requireClubManager } from "@/modules/identity/access";
import { validOrigin,readAuthForm,authRedirect } from "@/modules/identity/http";
import { identitySchema,versionSchema,imageKindSchema,imageType,MAX_IMAGE_BYTES } from "./validation";
export async function clubPost(request:Request,slug:string,action:string) {
  if(!validOrigin(request)) return new Response(null,{status:403});
  const {supabase,club}=await requireClubManager(slug);
  if(club.status==="archived") return new Response(null,{status:403});
  const back=`/gestao/${encodeURIComponent(club.slug)}`;
  const statusRedirect=(status:string)=>authRedirect(`${back}?status=${status}`);
  let form:FormData;
  try {form=await readAuthForm(request,action==="imagem" ? MAX_IMAGE_BYTES+8192 : 65536);}catch{return statusRedirect(action==="imagem" ? "file" : "invalid");}
  const settingsVersion=versionSchema.safeParse(form.get("settings_version"));
  if(!settingsVersion.success) return statusRedirect("invalid");
  let error;
  if(action==="salvar") {
    const parsed=identitySchema.safeParse(Object.fromEntries(form));
    const clubVersion=versionSchema.safeParse(form.get("club_version"));
    if(!parsed.success || !clubVersion.success) return statusRedirect("invalid");
    ({error}=await supabase.rpc("club_save_identity",{p_club_id:club.id,p_expected_club:clubVersion.data,p_expected_settings:settingsVersion.data,p_values:parsed.data}));
  } else if(action==="imagem" || action==="remover-imagem") {
    const kind=imageKindSchema.safeParse(form.get("kind"));
    if(!kind.success) return statusRedirect("invalid");
    let path:string|null=null;
    if(action==="imagem") {
      const file=form.get("file");
      if(!(file instanceof File) || !file.size || file.size>MAX_IMAGE_BYTES) return statusRedirect("file");
      const bytes=new Uint8Array(await file.arrayBuffer());const type=imageType(bytes);
      if(!type || type.mime!==file.type) return statusRedirect("file");
      path=`${club.id}/${kind.data}/${randomUUID()}.${type.extension}`;
      const upload=await supabase.storage.from("club-assets").upload(path,bytes,{contentType:type.mime,upsert:false,cacheControl:"0"});
      if(upload.error) return statusRedirect("failed");
    }
    // Revalidate current authorization and settings version inside the database.
    // A failed reference save leaves an unreferenced version, never deletes another file.
    ({error}=await supabase.rpc("club_set_image",{p_club_id:club.id,p_kind:kind.data,p_path:path,p_expected_settings:settingsVersion.data}));
  } else return new Response(null,{status:404});
  if(error) {
    if(error.code==="42501") return new Response(null,{status:403});
    return statusRedirect(["40001","PT409"].includes(error.code) ? "stale" : error.code==="23514" ? "invalid" : "failed");
  }
  return statusRedirect(action==="salvar" ? "saved" : action==="imagem" ? "image" : "removed");
}
export async function clubImage(slug:string,kindValue:string) {
  const {supabase,club}=await requireClubManager(slug);
  const kind=imageKindSchema.safeParse(kindValue);
  if(!kind.success || club.status==="archived") return new Response(null,{status:404});
  const {data:settings,error}=await supabase.from("club_settings").select("logo_path,cover_path").eq("club_id",club.id).single();
  if(error || !settings) return new Response(null,{status:404});
  const path=kind.data==="logo" ? settings.logo_path : settings.cover_path;
  if(!path || !path.startsWith(`${club.id}/${kind.data}/`)) return new Response(null,{status:404});
  const {data,error:downloadError}=await supabase.storage.from("club-assets").download(path);
  if(downloadError || !data || data.size>MAX_IMAGE_BYTES) return new Response(null,{status:404});
  const bytes=new Uint8Array(await data.arrayBuffer());const type=imageType(bytes);
  if(!type) return new Response(null,{status:404});
  return new Response(bytes,{headers:{"Content-Type":type.mime,"Content-Length":String(bytes.length),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Content-Disposition":`inline; filename="${kind.data}.${type.extension}"`}});
}
