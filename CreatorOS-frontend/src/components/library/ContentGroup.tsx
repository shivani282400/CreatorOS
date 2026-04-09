import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import VersionCard from "./VersionCard";
import type { ContentGroup as ContentGroupType } from "../../utils/groupContent";
import type { LibraryItem } from "./types";

type ContentGroupProps = {
  group: ContentGroupType<LibraryItem>;
  expanded: boolean;
  compareCount: number;
  selectedForCompare: LibraryItem[];
  highlightedId: number | null;
  favorites: number[];
  loadingId: number | null;
  scores: Record<number, number>;
  onToggleExpanded: () => void;
  onToggleCompare: (groupItems: LibraryItem[], item: LibraryItem) => void;
  onOpenCompare: (items: [LibraryItem, LibraryItem]) => void;
  onOpen: (item: LibraryItem) => void;
  onToggleFavorite: (id: number) => void;
  onRegenerate: (item: LibraryItem) => void;
  onGenerateLike: (item: LibraryItem) => void;
  onImprove: (item: LibraryItem) => void;
  onSchedule: (item: LibraryItem) => void;
  onDelete: (id: number) => void;
};

function ContentGroup({
  group,
  expanded,
  compareCount,
  selectedForCompare,
  highlightedId,
  favorites,
  loadingId,
  scores,
  onToggleExpanded,
  onToggleCompare,
  onOpenCompare,
  onOpen,
  onToggleFavorite,
  onRegenerate,
  onGenerateLike,
  onImprove,
  onSchedule,
  onDelete
}: ContentGroupProps) {
  const groupItems = [group.main, ...group.variations];

  const commonCardProps = {
    highlightedId,
    favorites,
    scores,
    onOpen,
    onToggleFavorite,
    onRegenerate,
    onGenerateLike,
    onImprove,
    onSchedule,
    onDelete
  };

  return (
    <div className="space-y-4">
      <VersionCard
        item={group.main}
        isFavorite={favorites.includes(group.main.id)}
        isHighlighted={highlightedId === group.main.id}
        isSelectedForCompare={selectedForCompare.some((item) => item.id === group.main.id)}
        loadingId={loadingId}
        score={scores[group.main.id] ?? group.main.score ?? 0}
        onToggleCompare={(item) => onToggleCompare(groupItems, item)}
        {...commonCardProps}
      />

      {group.variations.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.07]"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded
                ? "Hide Variations"
                : `Show Variations (${group.variations.length})`}
            </button>

            {compareCount === 2 ? (
              <button
                type="button"
                onClick={() => onOpenCompare(selectedForCompare as [LibraryItem, LibraryItem])}
                className="rounded-full bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30"
              >
                Compare Versions
              </button>
            ) : null}
          </div>

          {expanded ? (
            <div className="space-y-3">
              {group.variations.map((variation) => (
                <VersionCard
                  key={variation.id}
                  item={variation}
                  compact
                  isFavorite={favorites.includes(variation.id)}
                  isHighlighted={highlightedId === variation.id}
                  isSelectedForCompare={selectedForCompare.some((item) => item.id === variation.id)}
                  loadingId={loadingId}
                  score={scores[variation.id] ?? variation.score ?? 0}
                  onToggleCompare={(item) => onToggleCompare(groupItems, item)}
                  {...commonCardProps}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(ContentGroup);
