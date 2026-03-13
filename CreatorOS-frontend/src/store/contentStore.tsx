import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

export type ContentItem = {
  id: number
  title: string
  platform: string
  type: string
  date: string
  scheduledDate?: number
}

type ContentContextType = {
  contents: ContentItem[]
  addContent: (item: ContentItem) => void
  selectContent: (id: number) => void
  scheduleSelected: (day: number) => void
  selectedContentId: number | null
}

const ContentContext = createContext<ContentContextType | undefined>(undefined)

type ProviderProps = {
  children: ReactNode
}

export function ContentProvider({ children }: ProviderProps) {

  const [contents, setContents] = useState<ContentItem[]>([])
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null)

  const addContent = (item: ContentItem) => {
    setContents(prev => [...prev, item])
  }

  const selectContent = (id: number) => {
    setSelectedContentId(id)
  }

  const scheduleSelected = (day: number) => {

    if (!selectedContentId) return

    setContents(prev =>
      prev.map(item =>
        item.id === selectedContentId
          ? { ...item, scheduledDate: day }
          : item
      )
    )

    setSelectedContentId(null)

  }

  return (
    <ContentContext.Provider
      value={{
        contents,
        addContent,
        selectContent,
        scheduleSelected,
        selectedContentId
      }}
    >
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {

  const context = useContext(ContentContext)

  if (!context) {
    throw new Error("useContent must be used inside ContentProvider")
  }

  return context
}