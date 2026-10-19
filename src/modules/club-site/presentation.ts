export function validClubSlug(value:string) {
  return value.length>=2 && value.length<=80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
export function safeExternalLink(value:string|null) {
  if(!value) return null;
  try {const url=new URL(value);return url.protocol==="https:" && url.hostname && !url.username && !url.password ? url.href : null;}catch{return null;}
}
export function safeColor(value:string|null,fallback="#21543c") {
  return value && /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
}
function luminance(color:string) {
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(c=>c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
export function contrastInk(color:string) {
  const light=luminance(safeColor(color));
  const white=1.05/(light+.05),dark=(light+.05)/.05;
  return white>=dark ? "#ffffff" : "#000000";
}
export function phoneLink(value:string|null) {
  if(!value) return null;
  const digits=value.replace(/\D/g,"");
  return digits.length>=5 && digits.length<=30 ? `tel:${value.trim().startsWith("+") ? "+" : ""}${digits}` : null;
}
export function sportLabel(value:string) {return value==="volleyball" ? "Vôlei" : value;}
