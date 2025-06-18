"use client";

import { Button } from "@/components/ui/button";

interface ToolNavigationProps {
  activeTool: string;
  setActiveTool: (toolId: string) => void;
  tools: Array<{ id: string; label: string }>;
}

export function ToolNavigation({ activeTool, setActiveTool, tools }: ToolNavigationProps) {
  return (
    <nav className="flex flex-wrap justify-center mb-10 border-b border-border pb-4">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={activeTool === tool.id ? "default" : "secondary"}
          onClick={() => setActiveTool(tool.id)}
          className={`m-1 md:m-2 px-4 py-2 md:px-6 md:py-3 font-medium rounded-md
            ${activeTool === tool.id 
              ? 'bg-sky-600 text-white hover:bg-sky-700' 
              : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
            }`}
        >
          {tool.label}
        </Button>
      ))}
    </nav>
  );
}
