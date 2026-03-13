import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout"

type CalendarEvent = {
  id: number
  content_id: number
  scheduled_date: string
  topic: string
  platform: string
}

export default function Calendar() {

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalendar = async () => {

    try {

      const res = await fetch("http://localhost:4000/calendar")
      const result = await res.json()

      setEvents(result.data)

    } catch (err) {

      console.error("Calendar fetch failed", err)

    }

    setLoading(false)
  }

  useEffect(() => {
    fetchCalendar()
  }, [])

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {

    if (!acc[event.scheduled_date]) {
      acc[event.scheduled_date] = []
    }

    acc[event.scheduled_date].push(event)

    return acc

  }, {})

  if (loading) return <div>Loading calendar...</div>;

  return (
    <MainLayout>

      <h1 className="text-3xl font-bold mb-6">
        Content Calendar
      </h1>

      <div className="grid grid-cols-7 gap-4">

        {Object.entries(grouped).map(([date, items]) => (

          <div key={date} className="glass-panel p-4">

            <h4 className="mb-3 font-semibold">
              {date}
            </h4>

            <div className="space-y-3">
              {items.map((item) => (

                <div key={item.id} className="premium-card p-3">

                  <strong>{item.topic}</strong>
                  <p className="text-sm text-gray-400">{item.platform}</p>

                </div>

              ))}
            </div>

          </div>

        ))}

      </div>

    </MainLayout>

  )

}
