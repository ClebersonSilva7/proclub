import { clubImage } from "@/modules/clubs/http";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string;kind:string}>}) {
 const {slug,kind}=await params;return clubImage(slug,kind);
}
