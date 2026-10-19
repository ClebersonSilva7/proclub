import "server-only";
import {createPublicClient} from "@/lib/supabase/public";
import {getPublicClub} from "./data";
import {imageKindSchema,imageType,MAX_IMAGE_BYTES} from "@/modules/clubs/validation";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
export async function publicClubImage(slug:string,kindValue:string) {
  const kind=imageKindSchema.safeParse(kindValue);
  if(!kind.success) return new Response(null,{status:404,headers});
  const result=await getPublicClub(slug);
  if(!result) return new Response(null,{status:404,headers});
  const {club,settings}=result;
  const path=kind.data==="logo" ? settings.logo_path : settings.cover_path;
  if(!path || !path.startsWith(`${club.id}/${kind.data}/`)) return new Response(null,{status:404,headers});
  const supabase=createPublicClient();
  if(!supabase) return new Response(null,{status:404,headers});
  const {data,error}=await supabase.storage.from("club-assets").download(path);
  if(error || !data || data.size>MAX_IMAGE_BYTES) return new Response(null,{status:404,headers});
  const bytes=new Uint8Array(await data.arrayBuffer());const type=imageType(bytes);
  if(!type) return new Response(null,{status:404,headers});
  return new Response(bytes,{headers:{...headers,"Content-Type":type.mime,"Content-Length":String(bytes.length),"Content-Disposition":`inline; filename="${kind.data}.${type.extension}"`}});
}
