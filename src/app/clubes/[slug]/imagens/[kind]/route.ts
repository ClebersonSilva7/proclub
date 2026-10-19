import {publicClubImage} from "@/modules/club-site/image";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string;kind:string}>}) {
 const {slug,kind}=await params;return publicClubImage(slug,kind);
}
