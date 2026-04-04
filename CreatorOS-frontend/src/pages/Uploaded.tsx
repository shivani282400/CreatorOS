import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PageWrapper from "../components/PageWrapper";
import { authFetch } from "../utils/api";

type UploadedItem = {
  id: number;
  calendar_id: number;
  topic: string;
  script: string;
  platform: string;
  scheduled_date: string;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
};

type PerformanceForm = {
  views: string;
  likes: string;
  comments: string;
  shares: string;
};

const emptyPerformanceForm: PerformanceForm = {
  views: "",
  likes: "",
  comments: "",
  shares: ""
};

const formatGroupDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const hasPerformance = (item: UploadedItem) =>
  (item.views ?? 0) > 0 ||
  (item.likes ?? 0) > 0 ||
  (item.comments ?? 0) > 0 ||
  (item.shares ?? 0) > 0;

export default function Uploaded() {
  const navigate = useNavigate();
  const [content, setContent] = useState<UploadedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<UploadedItem | null>(null);
  const [performanceForm, setPerformanceForm] = useState<PerformanceForm>(emptyPerformanceForm);

  const fetchUploaded = async () => {
    const response = await authFetch("/content/uploaded");
    const result = await response.json();
    setContent(result.data ?? []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchUploaded();
      } catch (error) {
        console.error("Failed to fetch uploaded content", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const groupedContent = useMemo(() => {
    return content.reduce<Record<string, UploadedItem[]>>((acc, item) => {
      const key = item.scheduled_date;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);
      return acc;
    }, {});
  }, [content]);

  const openPerformanceModal = (item: UploadedItem) => {
    setSelectedItem(item);
    setPerformanceForm({
      views: String(item.views ?? ""),
      likes: String(item.likes ?? ""),
      comments: String(item.comments ?? ""),
      shares: String(item.shares ?? "")
    });
  };

  const closePerformanceModal = () => {
    setSelectedItem(null);
    setPerformanceForm(emptyPerformanceForm);
  };

  const handlePerformanceSubmit = async () => {
    if (!selectedItem) {
      return;
    }

    setActionId(selectedItem.calendar_id);

    try {
      await authFetch("/performance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          calendarId: selectedItem.calendar_id,
          views: Number(performanceForm.views || 0),
          likes: Number(performanceForm.likes || 0),
          comments: Number(performanceForm.comments || 0),
          shares: Number(performanceForm.shares || 0)
        })
      });

      closePerformanceModal();
      await fetchUploaded();
      navigate("/library");
    } catch (error) {
      console.error("Failed to save performance", error);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageWrapper>
          <div className="mx-auto max-w-7xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-sm text-white/60 backdrop-blur-xl">
            Loading uploaded content...
          </div>
        </PageWrapper>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Uploaded Content
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                Uploaded Content
              </h1>
              <p className="max-w-3xl text-lg text-white/50">
                Content moves here after its scheduled date passes. Add the real results,
                then continue working from your library.
              </p>
            </div>
          </section>

          {content.length === 0 ? (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-white/55 backdrop-blur-xl">
              No past scheduled content yet.
            </section>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedContent).map(([date, items]) => (
                <section key={date} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-500/15 p-3 text-indigo-300">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{formatGroupDate(date)}</h2>
                      <p className="text-sm text-white/45">
                        {items.length} content item{items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <article
                        key={`${item.calendar_id}-${item.id}`}
                        className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-200 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                              {item.platform}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{item.topic}</h3>
                          </div>

                          <span className="rounded-full border border-amber-400/20 bg-amber-500/15 px-3 py-1 text-[11px] font-medium text-amber-300">
                            Due
                          </span>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/55">
                          {item.script}
                        </p>

                        <p className="mt-4 text-xs text-white/40">
                          Scheduled for {formatGroupDate(item.scheduled_date)}
                        </p>

                        {hasPerformance(item) ? (
                          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                            <div>
                              <p className="text-white/35">Views</p>
                              <p className="mt-1 font-medium text-white">{item.views ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-white/35">Likes</p>
                              <p className="mt-1 font-medium text-white">{item.likes ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-white/35">Comments</p>
                              <p className="mt-1 font-medium text-white">{item.comments ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-white/35">Shares</p>
                              <p className="mt-1 font-medium text-white">{item.shares ?? 0}</p>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                          {!hasPerformance(item) ? (
                            <button
                              type="button"
                              onClick={() => openPerformanceModal(item)}
                              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-all duration-200 hover:bg-emerald-500/20"
                            >
                              Add Performance
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate("/library")}
                              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15"
                            >
                              Open in Library
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b1020]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
              <h3 className="text-xl font-semibold text-white">Add Performance</h3>
              <p className="mt-1 text-sm text-white/50">{selectedItem.topic}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["views", "Views"],
                    ["likes", "Likes"],
                    ["comments", "Comments"],
                    ["shares", "Shares"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="space-y-2">
                    <span className="text-sm text-white/50">{label}</span>
                    <input
                      type="number"
                      min="0"
                      value={performanceForm[key]}
                      onChange={(event) =>
                        setPerformanceForm((prev) => ({
                          ...prev,
                          [key]: event.target.value
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-400/40"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePerformanceModal}
                  className="rounded-xl px-4 py-2 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePerformanceSubmit}
                  disabled={actionId === selectedItem.calendar_id}
                  className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {actionId === selectedItem.calendar_id ? "Saving..." : "Save Performance"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </MainLayout>
  );
}
