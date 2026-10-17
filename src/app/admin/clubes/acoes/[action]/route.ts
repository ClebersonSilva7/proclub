import { adminPost } from "@/modules/platform/http";
export async function POST(request: Request, { params }: { params: Promise<{action: string}> }) {
  return adminPost(request, (await params).action);
}
