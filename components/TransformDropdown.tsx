import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useLimits } from "./hooks/useLimits";

// Define interfaces for our template data
interface BuiltInTemplate {
  name: string;
  value: string;
  prompt: string;
}

interface CustomTemplate {
  id: string;
  name: string;
  prompt: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateData {
  builtIn: BuiltInTemplate[];
  custom: CustomTemplate[];
}

export function TransformDropdown({
  onTransform,
  onManageTemplates,
  isStreaming = false,
  refreshTrigger,
}: {
  onTransform: (data: { typeName?: string; templateId?: string }) => void;
  onManageTemplates?: () => void;
  isStreaming?: boolean;
  refreshTrigger?: number; // Add a trigger to force refresh
}) {
  const { isLoading, transformationsData } = useLimits();
  const [templates, setTemplates] = useState<TemplateData | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Fetch templates on component mount and when refreshTrigger changes
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await fetch('/api/prompt-templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        } else {
          console.error('Failed to fetch templates');
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes



  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        asChild
        disabled={
          isStreaming || isLoading || transformationsData?.remaining === 0
        }
      >
        <button
          className={`w-full md:max-w-[322px] max-w-md py-2 rounded-lg font-semibold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors
            ${
              isStreaming
                ? "bg-slate-100 text-slate-400"
                : "bg-slate-900 text-white"
            }
          `}
        >
          <img src="/sparkFull.svg" className="size-5 min-w-5 min-h-5" />
          <span>{isStreaming ? "Streaming ..." : "Transform"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="!p-0 min-w-[322px] max-h-[400px] overflow-y-auto">
        {templatesLoading ? (
          <DropdownMenuItem className="h-[51px] p-3 text-slate-500">
            Loading templates...
          </DropdownMenuItem>
        ) : (
          <>
            {/* Manage Templates Button - moved to top */}
            {onManageTemplates && (
              <>
                <DropdownMenuItem
                  onSelect={onManageTemplates}
                  className="flex items-center gap-2 cursor-pointer h-[51px] p-3 hover:bg-slate-50 text-blue-600 font-medium"
                >
                  <img
                    src="/settings.svg"
                    className="size-[18px] min-w-[18px]"
                  />
                  <span>Manage Templates</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Built-in Templates Section */}
            <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50">
              Built-in Templates
            </DropdownMenuLabel>
            {templates?.builtIn.map((template) => (
              <DropdownMenuItem
                key={template.value}
                onSelect={() => onTransform({ typeName: template.value })}
                className="flex items-center gap-2 cursor-pointer h-[51px] p-3 border-b border-slate-200 hover:bg-slate-50"
              >
                <img
                  src={`/recordings/${template.value}.svg`}
                  className="size-[18px] min-w-[18px]"
                />
                <span>{template.name}</span>
              </DropdownMenuItem>
            ))}

            {/* Custom Templates Section (only show if user has custom templates) */}
            {templates?.custom && templates.custom.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50">
                  My Templates ({templates.custom.length})
                </DropdownMenuLabel>
                {templates.custom.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onSelect={() => onTransform({ templateId: template.id })}
                    className="flex items-center gap-2 cursor-pointer h-[51px] p-3 border-b border-slate-200 hover:bg-slate-50"
                  >
                    <img
                      src="/recordings/custom.svg"
                      className="size-[18px] min-w-[18px]"
                    />
                    <span>{template.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}




          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
