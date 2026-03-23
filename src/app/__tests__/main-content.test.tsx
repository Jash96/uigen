import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainContent } from "@/app/main-content";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    fileSystem: {},
    selectedFile: null,
    setSelectedFile: vi.fn(),
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    handleToolCall: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">PreviewFrame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders Preview tab as active by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeTruthy();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("switches to Code view when Code tab is clicked", () => {
  render(<MainContent />);
  const codeTab = screen.getByRole("tab", { name: "Code" });
  fireEvent.mouseDown(codeTab);
  expect(screen.getByTestId("code-editor")).toBeTruthy();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("switches back to Preview view when Preview tab is clicked", () => {
  render(<MainContent />);

  // Switch to Code first
  const codeTab = screen.getByRole("tab", { name: "Code" });
  fireEvent.mouseDown(codeTab);
  expect(screen.getByTestId("code-editor")).toBeTruthy();

  // Switch back to Preview
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  fireEvent.mouseDown(previewTab);
  expect(screen.getByTestId("preview-frame")).toBeTruthy();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggle header has pointer-events-auto class to work even when panel has pointer-events disabled", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  // Find the header div ancestor that should have pointer-events-auto
  const header = previewTab.closest(".pointer-events-auto");
  expect(header).toBeTruthy();
});
