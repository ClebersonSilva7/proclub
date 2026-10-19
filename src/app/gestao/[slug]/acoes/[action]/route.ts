import { clubPost } from "@/modules/clubs/http";
export async function POST(request:Request,{params}:{params:Promise<{slug:string;action:string}>}) {
 const {slug,action}=await params;return clubPost(request,slug,action);
}
