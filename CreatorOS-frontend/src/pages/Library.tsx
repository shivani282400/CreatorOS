import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout"
import { useNavigate } from "react-router-dom"
import { Youtube, Instagram, Twitter, Linkedin } from "lucide-react"

export default function Library() {

  const [content, setContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchContent = async () => {

    try {

      const res = await fetch("http://localhost:4000/content")
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

  const platformIcon = (platform:string) => {

    if(platform === "YouTube") return <Youtube size={16}/>
    if(platform === "Instagram") return <Instagram size={16}/>
    if(platform === "X") return <Twitter size={16}/>
    if(platform === "LinkedIn") return <Linkedin size={16}/>

    return null

  }

  if (loading) {
    return <div>Loading content...</div>;
  }

  return (

    <MainLayout>

      <h1 className="text-3xl font-bold mb-6">
        Content Library
      </h1>

      {content.length === 0 && (

        <div className="premium-card p-10 text-center text-gray-400">

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

      <div className="grid grid-cols-3 gap-6">

        {content.map((item) => (

          <div
            key={item.id}
            className="premium-card glow-border p-6"
          >

            <h2 className="text-lg font-semibold mb-3">
              {item.topic}
            </h2>

            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              {platformIcon(item.platform)}
              {item.platform}
            </div>

            <p className="text-sm text-gray-300 mb-4 line-clamp-4">
              {item.script}
            </p>

            <div className="text-sm text-gray-300">
              <strong>Hooks:</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {item.hooks.map((hook: string, i: number) => (
                  <li key={i}>{hook}</li>
                ))}
              </ul>
            </div>

          </div>

        ))}

      </div>

    </MainLayout>

  )

}
