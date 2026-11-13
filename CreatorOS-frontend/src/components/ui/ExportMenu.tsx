import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, Download, FileText, Share2 } from "lucide-react";

export type ExportAction = {
  key: string;
  label: string;
  hint?: string;
  icon?: "copy" | "download" | "pdf";
  run: () => void | boolean | Promise<void | boolean>;
  successMessage?: string;
};

type ExportMenuProps = {
  actions: ExportAction[];
  label?: string;
  align?: "left" | "right";
  disabled?: boolean;
};

const icons = {
  copy: Copy,
  download: Download,
  pdf: FileText
};

/** Small dropdown used wherever content can be exported (copy, Markdown/Notion, PDF, CSV, ICS...). */
export default function ExportMenu({ actions, label = "Export", align = "right", disabled = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = async (action: ExportAction) => {
    setOpen(false);

    try {
      const result = await action.run();
      if (result === false) {
        toast.error("Couldn't complete that export. Try again.");
        return;
      }
      toast.success(action.successMessage ?? "Done");
      setDone(action.key);
      setTimeout(() => setDone(null), 1500);
    } catch {
      toast.error("Couldn't complete that export. Try again.");
    }
  };

  return (
    <div ref={container} className="relative inline-block text-left" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {done ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-[90] mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0d1322] p-1 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {actions.map((action) => {
            const Icon = icons[action.icon ?? "download"];
            return (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                onClick={() => run(action)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                <span>
                  <span className="block text-sm text-white">{action.label}</span>
                  {action.hint ? <span className="block text-xs text-white/40">{action.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
