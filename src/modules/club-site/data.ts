import "server-only";
import {cache} from "react";
import {createPublicClient} from "@/lib/supabase/public";
import {validClubSlug} from "./presentation";
export const getPublicClub=cache(async(slug:string)=>{
  if(!validClubSlug(slug)) return null;
  const supabase=createPublicClient();
  if(!supabase) return null;
  const {data:club,error}=await supabase.from("clubs").select("id,name,slug,city,state,primary_sport").eq("slug",slug).eq("status","active").maybeSingle();
  if(error) throw new Error("Não foi possível carregar o clube.");
  if(!club) return null;
  const {data:settings,error:settingsError}=await supabase.from("club_settings").select("description,primary_color,secondary_color,logo_path,cover_path,public_email,public_phone,website_url,instagram_url,facebook_url").eq("club_id",club.id).maybeSingle();
  if(settingsError) throw new Error("Não foi possível carregar a apresentação do clube.");
  if(!settings) return null;
  return {club,settings};
});
export async function listPublicClubs(search:string,page:number) {
  const supabase=createPublicClient();
  if(!supabase) return {clubs:[],count:0,unavailable:true};
  let query=supabase.from("clubs").select("name,slug,city,state,primary_sport",{count:"exact"}).eq("status","active").order("name").order("id").range((page-1)*20,page*20-1);
  if(search) query=query.ilike("name",`%${search.replace(/[%_]/g,"")}%`);
  const {data,error,count}=await query;
  if(error) return {clubs:[],count:0,unavailable:true};
  return {clubs:data ?? [],count:count ?? 0,unavailable:false};
}
