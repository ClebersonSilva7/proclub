import { beforeEach, expect, it, vi } from "vitest";
const { rpc, guard } = vi.hoisted(() => ({rpc:vi.fn(),guard:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("../src/modules/identity/access",()=>({requirePlatformAdmin:guard}));
import { adminPost } from "../src/modules/platform/http";
const id = "88888888-0000-4000-8000-000000000101";
const club = {id:"",name:"Clube sintético",slug:"sintetico",primary_sport:"volleyball",city:"São Paulo",state:"SP",status:"draft",updated_at:"",reason:"Teste sintético autorizado"};
function post(action:string,form:Record<string,string>,origin="http://127.0.0.1:3000") {
  return adminPost(new Request(`http://127.0.0.1:3000/admin/clubes/acoes/${action}`,{method:"POST",headers:{Origin:origin},body:new URLSearchParams(form)}),action);
}
beforeEach(()=>{vi.resetAllMocks();process.env.APP_URL="http://127.0.0.1:3000";guard.mockResolvedValue({supabase:{rpc}});rpc.mockResolvedValue({data:id,error:null});});
it("blocks foreign or missing origin before privileged access",async()=>{
  for(const origin of ["https://evil.example",""]) expect((await post("salvar",club,origin)).status).toBe(403);
  expect(guard).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
it("requires a fresh global-admin guard before mutation",async()=>{
  guard.mockRejectedValue(new Error("redirect denied"));
  await expect(post("salvar",club)).rejects.toThrow("redirect denied");expect(rpc).not.toHaveBeenCalled();
});
it("validates fields, status, reason and version before RPC",async()=>{
  for(const changes of [{slug:"../admin"},{state:"XX"},{reason:"curto"},{status:"active"},{id,updated_at:""}]) {
    expect((await post("salvar",{...club,...changes})).headers.get("location")).toContain("status=invalid");
  }
  expect(rpc).not.toHaveBeenCalled();
});
it("saves a draft using verified session RPC and ignores forged operator fields",async()=>{
  const r = await post("salvar",{...club,operator:"victim",user_id:"victim"});
  expect(r.status).toBe(303);expect(r.headers.get("location")).toContain(`${id}?status=saved`);
  expect(rpc).toHaveBeenCalledWith("platform_save_club",expect.objectContaining({p_club_id:null,p_expected_updated_at:null,p_status:"draft"}));
  expect(rpc.mock.calls[0][1]).not.toHaveProperty("operator");
});
it("assigns club staff without offering platform-admin roles",async()=>{
  const form = {id,email:"fan@example.test",role:"manager",status:"active",expected_role:"",expected_status:"",reason:"Teste de vínculo sintético"};
  expect((await post("equipe",{...form,role:"platform_admin"})).headers.get("location")).toContain("invalid");
  expect(rpc).not.toHaveBeenCalled();
  await post("equipe",form);
  expect(rpc).toHaveBeenCalledWith("platform_set_staff",expect.objectContaining({p_expected_role:null,p_expected_status:null,p_role:"manager"}));
});
it("maps database rules, duplicates and concurrency without leaking database messages",async()=>{
  for(const [code,status] of [["PT409","stale"],["40001","stale"],["23505","duplicate"],["23514","rule"],["P0002","missing"],["XX000","failed"]]) {
    rpc.mockResolvedValue({data:null,error:{code,message:"private database detail"}});
    const r=await post("salvar",club);expect(r.headers.get("location")).toContain(`status=${status}`);expect(await r.text()).not.toContain("private database detail");
  }
});
