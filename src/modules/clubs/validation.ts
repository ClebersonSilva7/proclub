import { z } from "zod";
import { states } from "@/modules/platform/validation";
const httpsUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value);return url.protocol === "https:" && !!url.hostname && !url.username && !url.password; } catch { return false; }
}, "Use um endereço HTTPS completo, sem credenciais.");
export const identitySchema = z.object({
  name:z.string().trim().min(2).max(120),primary_sport:z.string().trim().min(2).max(60),
  city:z.string().trim().min(2).max(120),state:z.enum(states),description:z.string().trim().max(5000),
  primary_color:z.string().regex(/^#[0-9a-f]{6}$/i),secondary_color:z.string().regex(/^#[0-9a-f]{6}$/i),
  public_email:z.union([z.literal(""),z.email().max(254)]),public_phone:z.string().trim().max(30),
  website_url:httpsUrl,instagram_url:httpsUrl,facebook_url:httpsUrl,
});
export const versionSchema=z.iso.datetime({offset:true});
export const imageKindSchema=z.enum(["logo","cover"]);
export const MAX_IMAGE_BYTES=2*1024*1024;
export function imageType(bytes:Uint8Array) {
  if (bytes.length>=8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)) return {mime:"image/png",extension:"png"};
  if (bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {mime:"image/jpeg",extension:"jpg"};
  if (bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP") return {mime:"image/webp",extension:"webp"};
  return null;
}
export const clubMessages:Record<string,string>={
  saved:"Dados públicos do clube salvos.",image:"Imagem atualizada.",removed:"Imagem removida da identidade do clube.",
  invalid:"Revise os campos. Use cores no formato #123456, e-mail válido e links HTTPS completos.",
  stale:"Outra alteração foi salva enquanto esta página estava aberta. Confira os dados atuais e tente novamente.",
  file:"Envie uma imagem PNG, JPEG ou WebP de até 2 MB. Arquivos SVG não são aceitos.",
  failed:"Não foi possível salvar. Tente novamente; se a falha continuar, contate a administração ProClub.",
};
