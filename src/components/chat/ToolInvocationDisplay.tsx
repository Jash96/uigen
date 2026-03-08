import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
  toolCallId: string;
}

interface ToolInvocationDisplayProps {
  tool: ToolInvocation;
}

function getFilename(path: string): string {
  return path.split("/").pop() || path;
}

function getToolLabel(tool: ToolInvocation): string {
  const { toolName, args, state } = tool;
  const done = state === "result";
  const path = typeof args.path === "string" ? args.path : "";
  const filename = path ? getFilename(path) : "";

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;
    switch (command) {
      case "create":
        return done ? `Created ${filename}` : `Creating ${filename}`;
      case "str_replace":
        return done ? `Edited ${filename}` : `Editing ${filename}`;
      case "insert":
        return done ? `Edited ${filename}` : `Editing ${filename}`;
      case "view":
        return done ? `Viewed ${filename}` : `Viewing ${filename}`;
      default:
        return done ? `Modified ${filename}` : `Modifying ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    switch (command) {
      case "rename":
        return done ? `Renamed ${filename}` : `Renaming ${filename}`;
      case "delete":
        return done ? `Deleted ${filename}` : `Deleting ${filename}`;
      default:
        return done ? `Updated ${filename}` : `Updating ${filename}`;
    }
  }

  return toolName;
}

export function ToolInvocationDisplay({ tool }: ToolInvocationDisplayProps) {
  const label = getToolLabel(tool);
  const done = tool.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
