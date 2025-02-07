"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import TextDisplay from "../components/TextDisplay"
import SummaryDisplay from "../components/SummaryDisplay"
import AnnotationForm from "../components/AnnotationForm"
import NavigationBar from "../components/NavigationBar"

export default function AnnotatePage() {
  const router = useRouter()
  const [textsAndSummaries, setTextsAndSummaries] = useState<Array<{ id: string; text: string; summary: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<
    Array<{
      comprehensiveness: number
      laymanFriendliness: number
      factuality: number
      usefulness: number
    }>
  >([])

  // Check authentication and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user")
        if (!response.ok) {
          router.push("/login")
          return
        }
        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, textsAndSummaries.length - 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [textsAndSummaries.length])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Replace with actual API call
        const data = [
          {
            id: "a",
            text: "test text",
            summary: "test summary",
          },
          {
            id: "b",
            text: "test text",
            summary: "test summary",
          },
        ]
        setTextsAndSummaries(data)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to fetch data. Please try again later.")
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    if (textsAndSummaries.length > 0) {
      setAnnotations(
        textsAndSummaries.map(() => ({
          comprehensiveness: 0,
          laymanFriendliness: 0,
          factuality: 0,
          usefulness: 0,
        })),
      )
    }
  }, [textsAndSummaries])

  const handleAnnotationChange = useCallback(
    (newAnnotation: (typeof annotations)[0]) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations]
        newAnnotations[currentIndex] = newAnnotation
        return newAnnotations
      })
    },
    [currentIndex],
  )

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })
      if (response.ok) {
        router.push("/login")
        router.refresh()
      }
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  const currentItem = textsAndSummaries[currentIndex]
  const currentAnnotation = annotations[currentIndex] || {
    comprehensiveness: 0,
    laymanFriendliness: 0,
    factuality: 0,
    usefulness: 0,
  }

  const annotatedCount = annotations.filter((a) => Object.values(a).some((v) => v !== 0)).length

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-100 p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Text Annotation Tool</h1>
        <div className="flex items-center gap-4">
          {user && <span>Welcome, {user.name}</span>}
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      <div className="bg-gray-100 p-4 sticky top-16 z-10">
        <NavigationBar currentIndex={currentIndex} totalItems={textsAndSummaries.length} onNavigate={setCurrentIndex} />
      </div>
      <div className="bg-gray-100 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span>
              Progress: {annotatedCount} / {textsAndSummaries.length} annotated
            </span>
            <div className="flex items-center gap-2">
              <Progress value={(annotatedCount / textsAndSummaries.length) * 100} className="w-64" />
              <span className="text-sm text-gray-500">
                {Math.round((annotatedCount / textsAndSummaries.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-grow overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-1/2 h-full overflow-y-auto p-4 border-r">
          <TextDisplay text={currentItem.text} />
        </div>
        <div className="lg:w-1/2 h-full overflow-y-auto p-4">
          <SummaryDisplay summary={currentItem.summary} />
        </div>
      </main>
      <footer className="bg-gray-100 p-4 sticky bottom-0 z-10">
        <div className="flex justify-between mb-4">
          <Button
            onClick={() => setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button
            onClick={() => setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, textsAndSummaries.length - 1))}
            disabled={currentIndex === textsAndSummaries.length - 1}
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <AnnotationForm
          textId={currentItem.id}
          onAnnotationChange={handleAnnotationChange}
          initialAnnotation={currentAnnotation}
        />
      </footer>
    </div>
  )
}

