import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PageWrapper from "../components/PageWrapper";
import { authFetch } from "../utils/api";
import { getAIScore } from "../utils/aiScore";
import { groupContentByParent } from "../utils/groupContent";
import ContentGroup from "../components/library/ContentGroup";
import CompareModal from "../components/library/CompareModal";
import type { LibraryItem } from "../components/library/types";

type ExpandedState = Record<string, boolean>;

const highlightDurationMs = 2500;

export default function Library() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();

  const [content, setContent] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<LibraryItem | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<ExpandedState>({});
  const [selectedForCompare, setSelectedForCompare] = useState<LibraryItem[]>([]);
  const [compareItems, setCompareItems] = useState<[LibraryItem, LibraryItem] | null>(null);

  const targetContentId = routeId ? Number(routeId) : null;

  const fetchContent = async () => {
    try {
      const res = await authFetch("/content");
      const result = await res.json();
      setContent(result.data ?? []);
    } catch (error) {
      console.error("Failed to fetch content", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      const matchesSearch =
        item.topic.toLowerCase().includes(search.toLowerCase()) ||
        item.script.toLowerCase().includes(search.toLowerCase());

      const matchesTab =
        activeTab === "favorites" ? favorites.includes(item.id) : true;

      return matchesSearch && matchesTab;
    });
  }, [activeTab, content, favorites, search]);

  const groupedContent = useMemo(
    () => groupContentByParent(filteredContent),
    [filteredContent]
  );

  const scores = useMemo(() => {
    return content.reduce<Record<number, number>>((accumulator, item) => {
      accumulator[item.id] =
        typeof item.score === "number" ? item.score : getAIScore(item).score;
      return accumulator;
    }, {});
  }, [content]);

  useEffect(() => {
    if (!targetContentId || groupedContent.length === 0) {
      return;
    }

    const targetGroup = groupedContent.find((group) =>
      [group.main, ...group.variations].some((item) => item.id === targetContentId)
    );

    if (!targetGroup) {
      return;
    }

    const isVariation = targetGroup.variations.some((item) => item.id === targetContentId);

    if (isVariation) {
      setExpandedGroups((prev) => ({
        ...prev,
        [targetGroup.groupId]: true
      }));
    }

    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(`content-${targetContentId}`);

      if (!element) {
        return;
      }

      setHighlightedId(targetContentId);
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      window.setTimeout(() => {
        setHighlightedId((current) => (current === targetContentId ? null : current));
      }, highlightDurationMs);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [groupedContent, targetContentId]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favoriteId) => favoriteId !== id) : [...prev, id]
    );
  };

  const regenerate = async (item: LibraryItem) => {
    setLoadingId(item.id);

    try {
      const res = await authFetch("/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: item.topic,
          platform: item.platform
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error("AI generation failed");
      }

      await fetchContent();
    } catch (error) {
      console.error(error);
      alert("Regeneration failed");
    } finally {
      setLoadingId(null);
    }
  };

  const generateLike = async (item: LibraryItem) => {
    setLoadingId(item.id);

    try {
      const res = await authFetch("/ai/generate-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentId: item.id
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error("Generate like this failed");
      }

      setSelected({
        id: item.id,
        parent_id: item.parent_id ?? item.id,
        topic: `${item.topic} — Variation`,
        platform: item.platform,
        script: result.data.script,
        hooks: result.data.hooks,
        captions: result.data.captions,
        threads: result.data.threads,
        score: result.data.score,
        analysis: result.data.analysis,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      alert("Could not generate a similar variation");
    } finally {
      setLoadingId(null);
    }
  };

  const handleImprove = async (item: LibraryItem) => {
    try {
      setLoadingId(item.id);

      const res = await authFetch("/ai/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: item })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error("AI improve failed");
      }

      await fetchContent();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    await authFetch(`/content/${id}`, { method: "DELETE" });

    setSelectedForCompare((prev) => prev.filter((item) => item.id !== id));

    if (selected?.id === id) {
      setSelected(null);
    }

    if (targetContentId === id) {
      navigate("/library", { replace: true });
    }

    await fetchContent();
  };

  const openScheduleModal = (item: LibraryItem) => {
    setScheduleTarget(item);
    setSelectedDate("");
  };

  const closeScheduleModal = () => {
    setScheduleTarget(null);
    setSelectedDate("");
  };

  const handleSchedule = async () => {
    if (!scheduleTarget || !selectedDate) {
      return;
    }

    await authFetch("/calendar/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contentId: scheduleTarget.id,
        date: selectedDate
      })
    });

    closeScheduleModal();
  };

  const handleOpenCard = (item: LibraryItem) => {
    setSelected(item);
    navigate(`/library/${item.id}`, { replace: true });
  };

  const handleToggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleToggleCompare = (groupItems: LibraryItem[], item: LibraryItem) => {
    setSelectedForCompare((prev) => {
      const isSelected = prev.some((current) => current.id === item.id);

      if (isSelected) {
        return prev.filter((current) => current.id !== item.id);
      }

      const currentGroupSelection = prev.filter(
        (current) => groupItems.some((groupItem) => groupItem.id === current.id)
      );

      if (currentGroupSelection.length >= 2) {
        return prev;
      }

      return [...currentGroupSelection, item];
    });
  };

  const handleOpenCompare = (items: [LibraryItem, LibraryItem]) => {
    setCompareItems(items);
  };

  if (loading) {
    return <div>Loading content...</div>;
  }

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Content Hub
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                Content Library
              </h1>
              <p className="max-w-2xl text-lg text-white/50">
                Review saved drafts, group similar scripts together, and compare close
                variations side by side.
              </p>
            </div>
          </section>

          <section className="glass-panel rounded-[28px] border-white/10 bg-[#0a0f1d]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">Saved content</h2>
                  <p className="text-sm leading-6 text-white/45">
                    Similar scripts are clustered together so you can spot overlap and
                    compare the strongest versions quickly.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                      activeTab === "all"
                        ? "bg-white/10 text-white"
                        : "bg-transparent text-white/55 hover:bg-white/[0.04]"
                    }`}
                  >
                    All
                  </button>

                  <button
                    onClick={() => setActiveTab("favorites")}
                    className={`rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                      activeTab === "favorites"
                        ? "bg-white/10 text-white"
                        : "bg-transparent text-white/55 hover:bg-white/[0.04]"
                    }`}
                  >
                    ❤️ Favorites
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search content..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0d1322] px-4 py-3 outline-none transition-all duration-200 focus:border-indigo-400/40"
              />
            </div>

            {content.length === 0 ? (
              <div className="premium-card mt-8 p-10 text-center text-gray-400">
                No content yet.
              </div>
            ) : null}

            <div className="mt-8 space-y-8">
              {groupedContent.map((group) => {
                const compareCandidates = selectedForCompare.filter((item) =>
                  [group.main, ...group.variations].some((candidate) => candidate.id === item.id)
                );

                return (
                  <ContentGroup
                    key={group.groupId}
                    group={group}
                    expanded={Boolean(expandedGroups[group.groupId])}
                    compareCount={compareCandidates.length}
                    selectedForCompare={compareCandidates}
                    highlightedId={highlightedId}
                    favorites={favorites}
                    loadingId={loadingId}
                    scores={scores}
                    onToggleExpanded={() => handleToggleExpanded(group.groupId)}
                    onToggleCompare={handleToggleCompare}
                    onOpenCompare={handleOpenCompare}
                    onOpen={handleOpenCard}
                    onToggleFavorite={toggleFavorite}
                    onRegenerate={regenerate}
                    onGenerateLike={generateLike}
                    onImprove={handleImprove}
                    onSchedule={openScheduleModal}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>

            {activeTab === "favorites" && filteredContent.length === 0 ? (
              <p className="mt-6 text-sm text-gray-400">
                No favorites yet. Tap ❤️ to save content.
              </p>
            ) : null}

            {content.length > 0 && activeTab === "all" && groupedContent.length === 0 ? (
              <div className="mt-20 text-center text-gray-500">
                No content matches your search.
              </div>
            ) : null}

            {selected ? (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="max-h-[80vh] w-[600px] overflow-y-auto rounded-xl border border-white/10 bg-[rgba(12,12,15,0.96)] p-6 shadow-2xl">
                  <h2 className="text-xl font-semibold">{selected.topic}</h2>
                  <p className="text-sm text-gray-400">{selected.platform}</p>

                  <div className="mt-4">
                    <h4 className="font-medium">Script</h4>
                    <p className="mt-1 text-sm">{selected.script}</p>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium">Hooks</h4>
                    {selected.hooks?.map((hook, index) => (
                      <p key={index} className="text-sm">
                        • {hook}
                      </p>
                    ))}
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium">Captions</h4>
                    {selected.captions?.map((caption, index) => (
                      <p key={index} className="text-sm">
                        • {caption}
                      </p>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelected(null);
                      navigate(targetContentId ? `/library/${targetContentId}` : "/library", {
                        replace: true
                      });
                    }}
                    className="btn-primary mt-4"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

            {scheduleTarget ? (
              <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-xl border border-white/10 bg-[rgba(12,12,15,0.96)] p-6 shadow-2xl">
                  <h2 className="text-xl font-semibold">Schedule Content</h2>
                  <p className="mt-1 text-sm text-gray-400">{scheduleTarget.topic}</p>

                  <input
                    type="datetime-local"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={closeScheduleModal}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button onClick={handleSchedule} className="btn-primary">
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </PageWrapper>

      <CompareModal
        items={compareItems}
        scores={scores}
        onClose={() => setCompareItems(null)}
      />
    </MainLayout>
  );
}
