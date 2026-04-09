import { memo } from "react";
import type { LibraryItem } from "./types";

type VersionCardProps = {
  item: LibraryItem;
  compact?: boolean;
  isFavorite: boolean;
  isHighlighted: boolean;
  isSelectedForCompare: boolean;
  loadingId: number | null;
  score: number;
  onOpen: (item: LibraryItem) => void;
  onToggleFavorite: (id: number) => void;
  onToggleCompare: (item: LibraryItem) => void;
  onRegenerate: (item: LibraryItem) => void;
  onGenerateLike: (item: LibraryItem) => void;
  onImprove: (item: LibraryItem) => void;
  onSchedule: (item: LibraryItem) => void;
  onDelete: (id: number) => void;
};

function VersionCard({
  item,
  compact = false,
  isFavorite,
  isHighlighted,
  isSelectedForCompare,
  loadingId,
  score,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
  onRegenerate,
  onGenerateLike,
  onImprove,
  onSchedule,
  onDelete
}: VersionCardProps) {
  return (
    <article
      id={`content-${item.id}`}
      onClick={() => onOpen(item)}
      className={`cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 ${
        compact ? "ml-6 mt-3 scale-[0.98] opacity-90" : ""
      } ${
        isHighlighted ? "shadow-[0_0_0_1px_rgba(129,140,248,0.4),0_0_40px_rgba(99,102,241,0.28)] ring-2 ring-indigo-400/70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">{item.platform}</p>
            {item.parent_id ? (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/55">
                Variation
              </span>
            ) : null}
          </div>

          <h3 className={`mt-2 font-semibold text-white ${compact ? "text-sm" : "text-lg"}`}>
            {item.topic}
          </h3>
        </div>

        <span className="rounded-full bg-green-500/20 px-2 py-1 text-[10px] font-medium text-green-300">
          ↑ {score}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">{item.script}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>{new Date(item.created_at).toLocaleDateString()}</span>

        <label
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70"
        >
          <input
            type="checkbox"
            checked={isSelectedForCompare}
            onChange={() => onToggleCompare(item)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent text-indigo-400 focus:ring-indigo-400"
          />
          Compare
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="text-sm transition-transform duration-200 hover:scale-110"
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRegenerate(item);
            }}
            disabled={loadingId === item.id}
            className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/75 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingId === item.id ? "Generating..." : "🔁 Regenerate"}
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onGenerateLike(item);
            }}
            disabled={loadingId === item.id}
            className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/75 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
          >
            ✨ Generate Like This
          </button>

          {score < 75 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onImprove(item);
              }}
              disabled={loadingId === item.id}
              className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300 transition hover:bg-purple-500/30 disabled:cursor-wait disabled:opacity-60"
            >
              🔥 Improve
            </button>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSchedule(item);
            }}
            className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-300 transition hover:bg-blue-500/20"
          >
            📅 Schedule
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item.id);
            }}
            className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
          >
            🗑 Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(VersionCard);
