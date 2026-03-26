import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PageWrapper from "../components/PageWrapper";

type ContentItem = {
  id: number
  topic: string
  platform: string
  script: string
  hooks: string[]
  captions: string[]
  threads: string[]
  created_at: string
}

type CalendarRecord = {
  id: number
  content_id: number
  scheduled_date: string
  status: string
  created_at: string
  topic: string
  platform: string
}

type CalendarEvent = CalendarRecord & {
  script?: string
  hooks?: string[]
  captions?: string[]
  threads?: string[]
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const getColor = (platform: string) => {
  if (platform === "YouTube") {
    return {
      bg: "rgba(255,0,0,0.15)",
      text: "#FF4D4D"
    };
  }

  if (platform === "Instagram") {
    return {
      bg: "rgba(225,48,108,0.15)",
      text: "#E1306C"
    };
  }

  return {
    bg: "rgba(255,255,255,0.1)",
    text: "#fff"
  };
};

const EventCard = ({
  ev,
  onClick
}: {
  ev: CalendarEvent
  onClick: () => void
}) => {
  const color = getColor(ev.platform);

  return (
    <button
      type="button"
      className="w-full cursor-pointer truncate rounded-md px-2 py-1 text-left text-xs"
      style={{ background: color.bg, color: color.text }}
      onClick={onClick}
    >
      <p className="truncate font-medium">{ev.topic}</p>
      <p className="text-[10px] text-gray-400">{formatTime(ev.scheduled_date)}</p>
    </button>
  );
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [content, setContent] = useState<ContentItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    const [contentRes, calendarRes] = await Promise.all([
      fetch("http://localhost:4000/content"),
      fetch("http://localhost:4000/calendar")
    ]);

    const contentResult = await contentRes.json();
    const calendarResult = await calendarRes.json();

    const contentItems = (contentResult.data ?? []) as ContentItem[];
    const calendarItems = (calendarResult.data ?? []) as CalendarRecord[];
    const contentMap = new Map(contentItems.map((item) => [item.id, item]));
    const latestByContentId = new Map<number, CalendarRecord>();

    calendarItems.forEach((item) => {
      const existing = latestByContentId.get(item.content_id);

      if (
        !existing ||
        new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()
      ) {
        latestByContentId.set(item.content_id, item);
      }
    });

    const mergedEvents = Array.from(latestByContentId.values()).map((item) => {
      const match = contentMap.get(item.content_id);

      return {
        ...item,
        script: match?.script,
        hooks: match?.hooks,
        captions: match?.captions,
        threads: match?.threads
      };
    });

    setContent(contentItems);
    setEvents(mergedEvents);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchCalendar();
      } catch (err) {
        console.error("Calendar fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();

  const daysArray = useMemo(() => {
    const days: Array<number | null> = [];

    for (let i = 0; i < startDay; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(day);
    }

    return days;
  }, [startDay, totalDays]);

  const weekStart = getStartOfWeek(currentDate);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const prev = () => {
    const nextDate = new Date(currentDate);

    if (view === "month") {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else {
      nextDate.setDate(nextDate.getDate() - 7);
    }

    setCurrentDate(new Date(nextDate));
  };

  const next = () => {
    const nextDate = new Date(currentDate);

    if (view === "month") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    setCurrentDate(new Date(nextDate));
  };

  const openScheduleModal = (date: Date) => {
    const isoDate = new Date(date);
    isoDate.setHours(9, 0, 0, 0);
    setScheduleDate(isoDate.toISOString().slice(0, 16));
    setSelectedContentId(content[0]?.id ?? null);
  };

  const closeScheduleModal = () => {
    setScheduleDate(null);
    setSelectedContentId(null);
  };

  const handleSchedule = async () => {
    if (!selectedContentId || !scheduleDate) {
      return;
    }

    await fetch("http://localhost:4000/calendar/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contentId: selectedContentId,
        date: scheduleDate
      })
    });

    await fetchCalendar();
    closeScheduleModal();
  };

  if (loading) {
    return <div>Loading calendar...</div>;
  }

  return (
    <MainLayout>
      <PageWrapper>
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Planning
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white">
                Content Calendar
              </h1>
              <p className="max-w-2xl text-lg text-white/50">
                Plan what goes live next, review scheduled ideas, and keep publishing
                aligned with your content workflow.
              </p>
            </div>
          </section>

          <section className="glass-panel rounded-[28px] border-white/10 bg-[#0a0f1d]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Schedule overview</h2>
                <p className="text-sm leading-6 text-white/45">
                  Switch between month and week views, then click a date to place content.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={prev} className="rounded-xl bg-white/10 px-3 py-2 text-sm transition-all duration-200 hover:bg-white/[0.14]">←</button>

                <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-300">
                  {currentDate.toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric"
                  })}
                </span>

                <button onClick={next} className="rounded-xl bg-white/10 px-3 py-2 text-sm transition-all duration-200 hover:bg-white/[0.14]">→</button>

                <button
                  onClick={() => setView("month")}
                  className={`rounded-xl px-4 py-2 text-sm transition-all duration-200 ${view === "month" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.04]"}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView("week")}
                  className={`rounded-xl px-4 py-2 text-sm transition-all duration-200 ${view === "week" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.04]"}`}
                >
                  Week
                </button>

                <button
                  className="btn-primary"
                  onClick={() => navigate("/library")}
                >
                  + Schedule Content
                </button>
              </div>
            </div>

      {view === "month" && (
        <div className="glass-panel p-4">
          <div className="mb-4 grid grid-cols-7 gap-3">
            {weekdayLabels.map((label) => (
              <div key={label} className="px-3 py-2 text-xs text-gray-400">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {daysArray.map((day, index) => {
              const cellDate = day
                ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                : null;

              const dayEvents = events.filter((event) =>
                cellDate && isSameDay(new Date(event.scheduled_date), cellDate)
              );

              return (
                <button
                  type="button"
                  key={`${day ?? "empty"}-${index}`}
                  className="glass-panel p-3 h-32 text-left"
                  onClick={() => {
                    if (cellDate) {
                      openScheduleModal(cellDate);
                    }
                  }}
                >
                  <p className="text-xs text-gray-400">{day}</p>

                  <div className="mt-2 space-y-1">
                    {dayEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        ev={ev}
                        onClick={() => setSelectedEvent(ev)}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="glass-panel p-4">
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, index) => {
              const dayEvents = events.filter((event) =>
                isSameDay(new Date(event.scheduled_date), day)
              );

              return (
                <button
                  type="button"
                  key={index}
                  className="glass-panel p-3 h-40 text-left"
                  onClick={() => openScheduleModal(day)}
                >
                  <p className="text-xs text-gray-400">
                    {day.toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric"
                    })}
                  </p>

                  <div className="mt-2 space-y-1">
                    {dayEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        ev={ev}
                        onClick={() => setSelectedEvent(ev)}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-panel p-6 w-[500px] rounded-xl">
            <h2 className="text-xl font-semibold">{selectedEvent.topic}</h2>
            <p className="text-sm text-gray-400">{selectedEvent.platform}</p>

            <p className="mt-4">{selectedEvent.script}</p>

            <div className="mt-4">
              <h4 className="font-medium">Hooks</h4>
              {selectedEvent.hooks?.map((hook, index) => (
                <p key={index} className="text-sm">• {hook}</p>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="font-medium">Captions</h4>
              {selectedEvent.captions?.map((caption, index) => (
                <p key={index} className="text-sm">• {caption}</p>
              ))}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="btn-primary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {scheduleDate && (
        <div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 w-full max-w-md rounded-xl">
            <h2 className="text-xl font-semibold">Schedule Content</h2>
            <p className="text-sm text-gray-400 mt-1">Pick content and date</p>

            <select
              value={selectedContentId ?? ""}
              onChange={(e) => setSelectedContentId(Number(e.target.value))}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              {content.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.topic}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeScheduleModal} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button onClick={handleSchedule} className="btn-primary">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
          </section>
        </div>
      </PageWrapper>
    </MainLayout>
  );
}
