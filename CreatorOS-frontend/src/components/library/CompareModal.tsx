import { useEffect } from "react";
import type { LibraryItem } from "./types";

type CompareModalProps = {
  items: [LibraryItem, LibraryItem] | null;
  scores: Record<number, number>;
  onClose: () => void;
};

export default function CompareModal({ items, scores, onClose }: CompareModalProps) {
  useEffect(() => {
    if (!items) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, onClose]);

  if (!items) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-[80%] max-w-6xl rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Compare Versions</h2>
            <p className="mt-1 text-sm text-white/45">
              Review two versions side by side before choosing the strongest one.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/15"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                    {item.platform}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.topic}</h3>
                </div>

                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
                  Score {scores[item.id] ?? item.score ?? 0}
                </span>
              </div>

              <div className="mt-5 space-y-5 text-sm text-white/70">
                <div>
                  <h4 className="font-medium text-white">Script</h4>
                  <p className="mt-2 leading-7 text-white/65">{item.script}</p>
                </div>

                <div>
                  <h4 className="font-medium text-white">Hooks</h4>
                  <div className="mt-2 space-y-2">
                    {item.hooks?.map((hook, index) => (
                      <p key={index} className="text-white/65">
                        • {hook}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-white">Captions</h4>
                  <div className="mt-2 space-y-2">
                    {item.captions?.map((caption, index) => (
                      <p key={index} className="text-white/65">
                        • {caption}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
