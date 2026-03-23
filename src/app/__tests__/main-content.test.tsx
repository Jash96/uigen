import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

afterEach(() => {
  cleanup();
});

// Mock context providers (they require server-side setup)
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
  useChat: vi.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: vi.fn(),
  })),
}));

// Mock heavy child components
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

test("renders Preview tab as active by default", () => {
  render(<MainContent />);

  const previewTrigger = screen.getByRole("tab", { name: "Preview" });
  const codeTrigger = screen.getByRole("tab", { name: "Code" });

  expect(previewTrigger.getAttribute("data-state")).toBe("active");
  expect(codeTrigger.getAttribute("data-state")).toBe("inactive");
  expect(screen.queryByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code tab switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTrigger = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTrigger);

  expect(codeTrigger.getAttribute("data-state")).toBe("active");
  expect(screen.queryByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Preview tab switches back to preview view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to code first
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.queryByTestId("code-editor")).not.toBeNull();

  // Switch back to preview
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.queryByTestId("preview-frame")).not.toBeNull();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggling multiple times works correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  for (let i = 0; i < 3; i++) {
    await user.click(screen.getByRole("tab", { name: "Code" }));
    expect(screen.queryByTestId("code-editor")).not.toBeNull();

    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.queryByTestId("preview-frame")).not.toBeNull();
  }
});
