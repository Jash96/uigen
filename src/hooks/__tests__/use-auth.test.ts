import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// --- mock next/navigation ---
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// --- mock server actions ---
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

// --- mock anon-work-tracker ---
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// --- mock project actions ---
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// ---------------------------------------------------------------------------

function setup() {
  return renderHook(() => useAuth());
}

beforeEach(() => {
  vi.clearAllMocks();
  // sensible defaults — override per test as needed
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  mockSignIn.mockResolvedValue({ success: true });
  mockSignUp.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = setup();
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = setup();
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// signIn – happy paths
// ---------------------------------------------------------------------------

describe("signIn", () => {
  test("sets isLoading to true while in flight, then false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));

    const { result } = setup();

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signIn("a@b.com", "pw");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("calls signIn action with provided credentials", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.signIn("user@example.com", "secret");
    });
    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "secret");
  });

  test("returns the result from the server action", async () => {
    mockSignIn.mockResolvedValue({ success: true, data: "token" });
    const { result } = setup();
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signIn("a@b.com", "pw");
    });
    expect(returned).toEqual({ success: true, data: "token" });
  });

  test("does not call handlePostSignIn when sign-in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = setup();
    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });
    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // post-sign-in routing branches

  test("creates project from anon work and redirects when anon messages exist", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "hi" }],
      fileSystemData: { "/index.tsx": "code" },
    };
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

    const { result } = setup();
    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("redirects to most recent project when no anon work and projects exist", async () => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "recent-id" }, { id: "older-id" }]);

    const { result } = setup();
    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/recent-id");
  });

  test("creates a new project and redirects when no anon work and no existing projects", async () => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-id" });

    const { result } = setup();
    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
  });

  test("skips anon project creation when anonWork has empty messages array", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing-id" }]);

    const { result } = setup();
    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockPush).toHaveBeenCalledWith("/existing-id");
  });
});

// ---------------------------------------------------------------------------
// signIn – error states
// ---------------------------------------------------------------------------

describe("signIn error states", () => {
  test("resets isLoading to false even when the action throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("propagates thrown errors to the caller", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));
    const { result } = setup();

    let error: unknown;
    await act(async () => {
      error = await result.current.signIn("a@b.com", "pw").catch((e) => e);
    });

    expect((error as Error).message).toBe("Network error");
  });
});

// ---------------------------------------------------------------------------
// signUp – happy paths
// ---------------------------------------------------------------------------

describe("signUp", () => {
  test("sets isLoading to true while in flight, then false after", async () => {
    let resolveSignUp!: (v: unknown) => void;
    mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));

    const { result } = setup();

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signUp("a@b.com", "pw");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("calls signUp action with provided credentials", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.signUp("new@user.com", "hunter2");
    });
    expect(mockSignUp).toHaveBeenCalledWith("new@user.com", "hunter2");
  });

  test("returns the result from the server action", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });
    const { result } = setup();
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signUp("a@b.com", "pw");
    });
    expect(returned).toEqual({ success: false, error: "Email taken" });
  });

  test("does not redirect when sign-up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });
    const { result } = setup();
    await act(async () => {
      await result.current.signUp("a@b.com", "pw");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("runs the same post-sign-in routing logic on success", async () => {
    mockGetProjects.mockResolvedValue([{ id: "first-project" }]);

    const { result } = setup();
    await act(async () => {
      await result.current.signUp("a@b.com", "pw");
    });

    expect(mockPush).toHaveBeenCalledWith("/first-project");
  });
});

// ---------------------------------------------------------------------------
// signUp – error states
// ---------------------------------------------------------------------------

describe("signUp error states", () => {
  test("resets isLoading to false even when the action throws", async () => {
    mockSignUp.mockRejectedValue(new Error("Server down"));
    const { result } = setup();

    await act(async () => {
      await result.current.signUp("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
