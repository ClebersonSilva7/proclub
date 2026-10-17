export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!key.startsWith("sb_publishable_"))
    throw new Error("Use uma chave publicável Supabase.");
  return { url, key };
}

export function appOrigin() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("Configure APP_URL no servidor.");
  const url = new URL(value);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("APP_URL deve conter apenas a origem.");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("APP_URL exige HTTPS fora do desenvolvimento local.");
  return url.origin;
}
