import { useState } from "react"
import MainLayout from "../layouts/MainLayout"
import { useContent } from "../store/contentStore"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import PageWrapper from "../components/PageWrapper"

type GeneratedContent = {
  script: string
  hooks: string[]
  captions: string[]
  threads: string[]
}

export default function Generate() {

  const { addContent } = useContent()

  const [platform, setPlatform] = useState("YouTube")
  const [tone, setTone] = useState("Educational")
  const [goal, setGoal] = useState("Grow Audience")
  const [type, setType] = useState("Script")

  const [topic, setTopic] = useState("")
  const [script, setScript] = useState("")
  const [hooks, setHooks] = useState<string[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [threads, setThreads] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const generateContent = async () => {

    if (!topic) {
      toast.error("Enter a topic first")
      return
    }

    setLoading(true)

    try {

      const res = await fetch("http://localhost:4000/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          platform
        })
      })

      const result = await res.json()

      if (!res.ok || !result.success || !result.data) {
        throw new Error(result.error || "Generation failed")
      }

      const data = result.data as GeneratedContent

      setScript(data.script)
      setHooks(data.hooks)
      setCaptions(data.captions)
      setThreads(data.threads)

      toast.success("Content generated")

    } catch (err) {

      console.error("Generation failed", err)
      toast.error("Generation failed")

    } finally {
      setLoading(false)
    }

  }

  const saveContent = () => {

    if (!script) {
      toast.error("Generate content first")
      return
    }

    addContent({
      id: Date.now(),
      title: topic,
      platform,
      type,
      date: new Date().toLocaleDateString()
    })

    toast.success("Saved to Library")

  }

  return (

    <MainLayout>

      <PageWrapper>

        <h1 className="text-3xl font-bold mb-6">
          AI Content Generator
        </h1>

        <div className="grid grid-cols-3 gap-6">

          {/* LEFT PANEL */}

          <div className="premium-card p-6 space-y-4">

            <h2 className="font-semibold">
              Content Settings
            </h2>

            <select
              value={platform}
              onChange={(e)=>setPlatform(e.target.value)}
              className="w-full bg-[#1D212B] p-2 rounded"
            >
              <option>YouTube</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>X</option>
              <option>LinkedIn</option>
            </select>

            <select
              value={tone}
              onChange={(e)=>setTone(e.target.value)}
              className="w-full bg-[#1D212B] p-2 rounded"
            >
              <option>Educational</option>
              <option>Storytelling</option>
              <option>Authority</option>
              <option>Entertaining</option>
            </select>

            <select
              value={goal}
              onChange={(e)=>setGoal(e.target.value)}
              className="w-full bg-[#1D212B] p-2 rounded"
            >
              <option>Grow Audience</option>
              <option>Build Brand</option>
              <option>Sell Product</option>
              <option>Increase Engagement</option>
            </select>

            <select
              value={type}
              onChange={(e)=>setType(e.target.value)}
              className="w-full bg-[#1D212B] p-2 rounded"
            >
              <option>Script</option>
              <option>Hook</option>
              <option>Caption</option>
              <option>Thread</option>
              <option>Carousel</option>
            </select>

          </div>


          {/* CENTER PANEL */}

          <div className="premium-card p-6">

            <textarea
              placeholder="Enter your content idea..."
              value={topic}
              onChange={(e)=>setTopic(e.target.value)}
              className="w-full h-28 bg-[#1D212B] p-3 rounded mb-4"
            />

            <div className="flex gap-4 mb-6">

              <button
                onClick={generateContent}
                className="btn-primary flex items-center gap-2"
              >
                <Sparkles size={16}/>
                Generate Content
              </button>

              <button
                onClick={saveContent}
                className="bg-green-500 px-4 py-2 rounded"
              >
                Save
              </button>

            </div>

            <div className="bg-[#1D212B] p-4 rounded min-h-[220px]">

              {loading ? (
                <p className="text-gray-400">
                  Generating content...
                </p>
              ) : script || hooks.length || captions.length || threads.length ? (
                <div className="space-y-6 text-gray-300">
                  <div>
                    <h3 className="mb-2 font-semibold text-white">
                      Script
                    </h3>
                    <textarea
                      value={script}
                      readOnly
                      className="w-full min-h-[180px] bg-[#141821] p-3 rounded text-gray-300"
                    />
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-white">
                      Hooks
                    </h3>
                    <div className="space-y-2">
                      {hooks.map((hook, i) => (
                        <div key={i} className="rounded bg-[#141821] p-3">
                          {hook}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-white">
                      Captions
                    </h3>
                    <div className="space-y-2">
                      {captions.map((caption, i) => (
                        <div key={i} className="rounded bg-[#141821] p-3">
                          {caption}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-white">
                      Threads
                    </h3>
                    <div className="space-y-2">
                      {threads.map((thread, i) => (
                        <div key={i} className="rounded bg-[#141821] p-3">
                          {thread}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">
                  Generated content will appear here
                </p>
              )}

            </div>

          </div>


          {/* RIGHT PANEL */}

          <div className="premium-card p-6 space-y-4">

            <h2 className="font-semibold">
              AI Suggestions
            </h2>

            <ul className="text-sm text-gray-400 space-y-2">
              <li>• AI tools for creators</li>
              <li>• Productivity hacks</li>
              <li>• Content growth strategies</li>
              <li>• Future of AI</li>
            </ul>

            <h2 className="font-semibold mt-4">
              Hook Ideas
            </h2>

            <ul className="text-sm text-gray-400 space-y-2">
              <li>• "Nobody talks about this..."</li>
              <li>• "Stop doing this mistake..."</li>
              <li>• "This changed my workflow..."</li>
            </ul>

          </div>

        </div>

      </PageWrapper>

    </MainLayout>

  )

}
