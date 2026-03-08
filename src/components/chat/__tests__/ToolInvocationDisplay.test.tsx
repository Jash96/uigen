import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/components/Card.tsx" },
    state: "result",
    result: "Success",
    ...overrides,
  };
}

test("shows 'Created' for str_replace_editor create command when done", () => {
  render(<ToolInvocationDisplay tool={makeTool()} />);
  expect(screen.getByText("Created Card.tsx")).toBeDefined();
});

test("shows 'Creating' for str_replace_editor create command in progress", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({ state: "call" })}
    />
  );
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({ args: { command: "str_replace", path: "/src/App.tsx" } })}
    />
  );
  expect(screen.getByText("Edited App.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace in progress", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({
        args: { command: "str_replace", path: "/src/App.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({ args: { command: "insert", path: "/utils/helpers.ts" } })}
    />
  );
  expect(screen.getByText("Edited helpers.ts")).toBeDefined();
});

test("shows 'Viewed' for str_replace_editor view command", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({ args: { command: "view", path: "/index.tsx" } })}
    />
  );
  expect(screen.getByText("Viewed index.tsx")).toBeDefined();
});

test("shows 'Renamed' for file_manager rename command", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({
        toolName: "file_manager",
        args: { command: "rename", path: "/old.tsx", new_path: "/new.tsx" },
      })}
    />
  );
  expect(screen.getByText("Renamed old.tsx")).toBeDefined();
});

test("shows 'Deleted' for file_manager delete command", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({
        toolName: "file_manager",
        args: { command: "delete", path: "/components/Old.tsx" },
      })}
    />
  );
  expect(screen.getByText("Deleted Old.tsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete in progress", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({
        toolName: "file_manager",
        args: { command: "delete", path: "/components/Old.tsx" },
        state: "partial-call",
      })}
    />
  );
  expect(screen.getByText("Deleting Old.tsx")).toBeDefined();
});

test("falls back to tool name for unknown tools", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({ toolName: "unknown_tool", args: {} })}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("extracts filename from nested path", () => {
  render(
    <ToolInvocationDisplay
      tool={makeTool({
        args: { command: "create", path: "/src/components/ui/Button.tsx" },
      })}
    />
  );
  expect(screen.getByText("Created Button.tsx")).toBeDefined();
});

test("shows green dot when completed", () => {
  const { container } = render(<ToolInvocationDisplay tool={makeTool()} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("shows spinner when in progress", () => {
  const { container } = render(
    <ToolInvocationDisplay tool={makeTool({ state: "call" })} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
