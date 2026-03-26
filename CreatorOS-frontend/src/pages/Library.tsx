import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import MainLayout from "../layouts/MainLayout"
import { useNavigate } from "react-router-dom"
import { getAIScore } from "../utils/aiScore"
import PageWrapper from "../components/PageWrapper";
import { authFetch } from "../utils/api";

type LibraryItem = {
  id: number
  topic: string
  platform: string
  script: string
  hooks?: string[]
  captions?: string[]
  threads?: string[]
  score?: number
  analysis?: {
    hook_strength: number
    emotional_intensity: number
    engagement: number
    structure: number
    platform_fit: number
    summary: string
    improvements: string[]
  }
  created_at: string
}

export default function Library() {

  const [content, setContent] = useState<LibraryItem[]>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<LibraryItem | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const navigate = useNavigate()

  const fetchContent = async () => {

    try {

      const res = await authFetch("/content")
      const result = await res.json()

      setContent(result.data)

    } catch (err) {

      console.error("Failed to fetch content", err)

    }

    setLoading(false)

  }

  useEffect(() => {
    fetchContent()
  }, [])

  const toggleFavorite = (id: number) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    )
  }

  const regenerate = async (item: LibraryItem) => {
    setLoadingId(item.id)

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
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error("AI generation failed")
      }

      // Backend already auto-saves /ai/generate results.
      await fetchContent()
      console.log("New content added")
    } catch (err) {
      console.error(err)
      alert("Regeneration failed")
    } finally {
      setLoadingId(null)
    }
  }

  const handleImprove = async (content: LibraryItem) => {
    try {
      setLoadingId(content.id)

      const res = await authFetch("/ai/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
      })

      const result = await res.json()

      if (!result.success) {
        throw new Error("AI improve failed")
      }

      await fetchContent()
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    await authFetch(`/content/${id}`, { method: "DELETE" });
    if (selected?.id === id) {
      setSelected(null);
    }
    await fetchContent();
  };

  const openScheduleModal = (content: LibraryItem) => {
    setScheduleTarget(content);
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

  const filtered = content.filter(item =>
    item.topic.toLowerCase().includes(search.toLowerCase()) ||
    item.script?.toLowerCase().includes(search.toLowerCase())
  )

  const visibleContent =
    activeTab === "favorites"
      ? filtered.filter(item => favorites.includes(item.id))
      : filtered;

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
                Review saved drafts, favorite the strongest ideas, and decide what to
                improve, schedule, or remove.
              </p>
            </div>
          </section>

          <section className="glass-panel rounded-[28px] border-white/10 bg-[#0a0f1d]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">Saved content</h2>
                  <p className="text-sm leading-6 text-white/45">
                    Search through your saved scripts and keep the strongest pieces close.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                      activeTab === "all" ? "bg-white/10 text-white" : "bg-transparent text-white/55 hover:bg-white/[0.04]"
                    }`}
                  >
                    All
                  </button>

                  <button
                    onClick={() => setActiveTab("favorites")}
                    className={`rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                      activeTab === "favorites" ? "bg-white/10 text-white" : "bg-transparent text-white/55 hover:bg-white/[0.04]"
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
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0d1322] px-4 py-3 outline-none transition-all duration-200 focus:border-indigo-400/40"
              />
            </div>

      {content.length === 0 && (

        <div className="premium-card mt-8 p-10 text-center text-gray-400">

          No content yet.

          <div className="mt-4">

            <button
              onClick={() => navigate("/generate")}
              className="btn-primary"
            >
              Generate Content
            </button>

          </div>

        </div>

      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

        {visibleContent.map((item, index) => (
          (() => {
            const isHovered = hovered === item.id
            const score = typeof item.score === "number" ? item.score : getAIScore(item).score

            return (

          <div
            key={item.id}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className="relative premium-card cursor-pointer p-5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-purple-500/10 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] animate-[fadeIn_0.4s_ease]"
            style={{
              animationDelay: `${index * 50}ms`,
              boxShadow: "0 0 0 rgba(0,0,0,0)"
            }}
            onClick={() => {
              setHovered(null)
              setSelected(item)
            }}
          >
            <div className="flex h-full flex-col justify-between relative z-10 pointer-events-auto">
              <div className="relative min-h-[170px]">
                <div className={`${isHovered ? "opacity-0" : "opacity-100"} transition-all duration-200`}>
                  <div className="flex justify-between items-center">

                    <span className="text-xs text-gray-400">
                      {item.platform}
                    </span>

                    <span className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-400">
                      ↑ {score}
                    </span>

                  </div>

                  <div className="mt-3 flex justify-between items-center">

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className="transition-transform duration-200 hover:scale-125"
                    >
                      {favorites.includes(item.id) ? "❤️" : "🤍"}
                    </button>

                  </div>

                  <h3 className="mt-2 text-sm font-semibold">
                    {item.topic}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-xs text-gray-400">
                    {item.script}
                  </p>

                  <p className="mt-3 text-[10px] text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>

                {isHovered && (
                  <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border border-white/10 bg-[#0f0f0f]/95 p-4 shadow-xl transition-all duration-200">
                    <p className="line-clamp-4 text-xs text-gray-300">
                      {item.script}
                    </p>

                    <div className="mt-2">
                      {item.hooks?.slice(0, 2).map((hook, hookIndex) => (
                        <p key={hookIndex} className="text-[10px] text-gray-400">
                          • {hook}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-30 pointer-events-auto mt-auto pt-3 border-t border-white/10 bg-transparent">
                <div className="flex gap-3 flex-wrap mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      regenerate(item);
                    }}
                    disabled={loadingId === item.id}
                    className="text-sm text-gray-400 hover:text-white transition disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingId === item.id ? "Generating..." : "🔁 Regenerate"}
                  </button>

                  {score < 75 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImprove(item);
                      }}
                      className="text-sm bg-purple-500/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-500/30 disabled:cursor-wait disabled:opacity-60"
                      disabled={loadingId === item.id}
                    >
                      {loadingId === item.id ? "Improving..." : "🔥 Improve"}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openScheduleModal(item);
                    }}
                    className="text-blue-400 text-xs hover:text-blue-300"
                  >
                    📅 Schedule
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="text-red-400 text-xs hover:text-red-300"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>

          </div>
            )
          })()

        ))}

      </div>

      {activeTab === "favorites" && favorites.length > 0 && visibleContent.length === 0 && (
        <p className="text-gray-400 text-sm mt-6">
          No favorites yet. Tap ❤️ to save content.
        </p>
      )}

      {activeTab === "favorites" && favorites.length === 0 && (
        <p className="text-gray-400 text-sm mt-6">
          No favorites yet. Tap ❤️ to save content.
        </p>
      )}

      {content.length > 0 && activeTab === "all" && visibleContent.length === 0 && (
        <div className="text-center text-gray-500 mt-20">
          No content matches your search.
        </div>
      )}

      {selected && (

        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div
            className="w-[600px] max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 p-6 shadow-2xl animate-[fadeIn_0.3s_ease]"
            style={{
              background: "rgba(12, 12, 15, 0.96)",
              backdropFilter: "blur(24px)"
            }}
          >

            <h2 className="text-xl font-semibold">{selected.topic}</h2>

            <p className="text-sm text-gray-400">{selected.platform}</p>

            <div className="mt-4">
              <h4 className="font-medium">Script</h4>
              <p className="text-sm mt-1">{selected.script}</p>
            </div>

            <div className="mt-4">
              <h4 className="font-medium">Hooks</h4>
              {selected.hooks?.map((hook, index) => (
                <p key={index} className="text-sm">• {hook}</p>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="font-medium">Captions</h4>
              {selected.captions?.map((caption, index) => (
                <p key={index} className="text-sm">• {caption}</p>
              ))}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="btn-primary mt-4"
            >
              Close
            </button>

          </div>

        </div>
      )}

      {scheduleTarget && (
        <div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-xl border border-white/10 p-6 shadow-2xl"
            style={{
              background: "rgba(12, 12, 15, 0.96)",
              backdropFilter: "blur(24px)"
            }}
          >
            <h2 className="text-xl font-semibold">Schedule Content</h2>
            <p className="text-sm text-gray-400 mt-1">{scheduleTarget.topic}</p>

            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={closeScheduleModal} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button onClick={handleSchedule} className="btn-primary">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
          </section>
        </div>
      </PageWrapper>

    </MainLayout>

  )

}
