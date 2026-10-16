import { expect, test } from "vitest";
import { GET } from "../src/app/api/health/route";
test("liveness returns only public service status", async () => { const response = GET(); expect(response.status).toBe(200); expect(await response.json()).toEqual({status:"ok",service:"proclub"}); });
