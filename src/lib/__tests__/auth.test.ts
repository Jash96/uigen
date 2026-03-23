// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-42", email: "hello@world.com" });
    mockCookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    const session = await getSession();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@world.com");
  });

  test("returns null for a tampered/invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "-1s");
    mockCookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns null for an empty token string", async () => {
    mockCookieStore.get.mockReturnValue({ value: "" });
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });
});
