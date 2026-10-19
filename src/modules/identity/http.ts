import "server-only";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/supabase/config";

export function authRedirect(path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin()), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export function validOrigin(request: Request) {
  return request.headers.get("origin") === appOrigin();
}

export async function readAuthForm(request: Request, maxBytes = 8192) {
  const reader = request.body?.getReader();
  if (!reader) return new FormData();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Form too large");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(buffer, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
