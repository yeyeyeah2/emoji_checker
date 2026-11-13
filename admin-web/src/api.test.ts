import { describe, expect, it, vi } from "vitest";

import { ApiError, buildQuery, request } from "./api";

describe("buildQuery", () => {
  it("omits empty filters and encodes values", () => {
    expect(buildQuery({ course: "SE 01", source: "", limit: 50, active: false })).toBe("?course=SE+01&limit=50&active=false");
  });
});

describe("request", () => {
  it("sends bearer auth and unwraps JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(request("/test", {}, "token-value")).resolves.toEqual({ data: 1 });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token-value");
    fetchMock.mockRestore();
  });

  it("uses the backend error envelope", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "forbidden", message: "权限不足" } }), { status: 403, headers: { "Content-Type": "application/json" } }));
    const error = await request("/test").catch((reason) => reason as ApiError);
    expect(error).toMatchObject({ status: 403, code: "forbidden", message: "权限不足" });
    fetchMock.mockRestore();
  });
});
