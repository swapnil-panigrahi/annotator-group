"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import TextDisplay from "../components/TextDisplay"
import SummaryDisplay from "../components/SummaryDisplay"
import AnnotationForm from "../components/AnnotationForm"
import NavigationBar from "../components/NavigationBar"
import { createBrowserClient } from '@supabase/ssr'

interface Summary {
  id: string
  text: string
  summary: string
  pmid?: string
  assigned_at: string
  completed: boolean
}

export default function AnnotatePage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<
    Array<{
      comprehensiveness: number
      layness: number
      factuality: number
      usefulness: number
      labels?: Array<{
        text: string
        type: string
        startIndex: number
        endIndex: number
      }>
    }>
  >([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  )

  const fetchUserSummaries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No active session, redirecting to login...')
        router.push('/login')
        return
      }

      const response = await fetch('/api/summaries', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, redirecting to login...')
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch summaries')
      }

      const data = await response.json()
      console.log('Fetched summaries:', data)
      setSummaries(data.summaries || [])
    } catch (err) {
      console.error("Error fetching summaries:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch summaries")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserSummaries()
  }, [])

  useEffect(() => {
    if (summaries.length > 0) {
      setAnnotations(
        summaries.map(() => ({
          comprehensiveness: 0,
          layness: 0,
          factuality: 0,
          usefulness: 0,
          labels: []
        })),
      )
    }
  }, [summaries])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, summaries.length - 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [summaries.length])

  const handleAnnotationChange = useCallback(
    (newAnnotation: Omit<(typeof annotations)[0], 'labels'>) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations]
        newAnnotations[currentIndex] = {
          ...newAnnotation,
          labels: prevAnnotations[currentIndex]?.labels || []
        }
        return newAnnotations
      })
    },
    [currentIndex],
  )

  const handleAddLabel = useCallback(
    (labelType: string, selectedText: string, startIndex: number, endIndex: number) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations]
        const currentAnnotation = newAnnotations[currentIndex]
        newAnnotations[currentIndex] = {
          ...currentAnnotation,
          labels: [
            ...(currentAnnotation.labels || []),
            { text: selectedText, type: labelType, startIndex, endIndex }
          ]
        }
        return newAnnotations
      })
    },
    [currentIndex],
  )

  const handleDeleteLabel = useCallback(
    (labelIndex: number) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations]
        const currentAnnotation = newAnnotations[currentIndex]
        if (currentAnnotation.labels) {
          newAnnotations[currentIndex] = {
            ...currentAnnotation,
            labels: currentAnnotation.labels.filter((_, index) => index !== labelIndex)
          }
        }
        return newAnnotations
      })
    },
    [currentIndex],
  )

  const handleLogout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUserName(profile.name)
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  if (summaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Summaries Assigned</h2>
          <p className="text-gray-600">You don't have any summaries assigned to you yet.</p>
          <Button 
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    )
  }

  const currentSummary = summaries[currentIndex]
  const currentAnnotation = annotations[currentIndex] || {
    comprehensiveness: 0,
    layness: 0,
    factuality: 0,
    usefulness: 0,
  }

  const annotatedCount = annotations.filter((a) => Object.values(a).some((v) => v !== 0)).length

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-100 py-2 px-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Text Annotation Tool</h1>
            <div className="ml-6">
              <NavigationBar currentIndex={currentIndex} totalItems={summaries.length} onNavigate={setCurrentIndex} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm">
                Progress: {annotatedCount} / {summaries.length}
              </span>
              <Progress value={(annotatedCount / summaries.length) * 100} className="w-32 h-2" />
              <span className="text-xs text-gray-500">
                {Math.round((annotatedCount / summaries.length) * 100)}%
              </span>
            </div>
            <a
              href="/guidelines.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-1"
              >
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Guidelines
            </a>
            {userName && <span className="text-gray-600 text-sm">Welcome, {userName}</span>}
            <Button 
              onClick={handleLogout}
              disabled={loading}
              size="sm"
            >
              {loading ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:w-1/2 h-full overflow-y-auto p-4 border-r">
          <TextDisplay text={currentSummary.text} />
        </div>
        <div className="lg:w-1/2 h-full overflow-y-auto p-4">
          <SummaryDisplay 
            summary={currentSummary.summary}
            pmid={currentSummary.pmid}
            onAddLabel={handleAddLabel}
            onDeleteLabel={handleDeleteLabel}
            labels={currentAnnotation.labels}
          />
        </div>
      </main>
      <footer className="bg-gray-100 pt-2 pb-3 px-4 sticky bottom-0 z-10">
        <div className="flex justify-between mb-2">
          <Button
            onClick={() => setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))}
            disabled={currentIndex === 0}
            size="sm"
            className="ml-4"
          >
            <ChevronLeft className="mr-1 h-3 w-3" /> Previous
          </Button>
          <Button
            onClick={() => setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, summaries.length - 1))}
            disabled={currentIndex === summaries.length - 1}
            size="sm"
            className="mr-4"
          >
            Next <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        <AnnotationForm
          textId={currentSummary.id}
          onAnnotationChange={handleAnnotationChange}
          initialAnnotation={currentAnnotation}
          labels={currentAnnotation.labels}
        />
      </footer>
    </div>
  )
}

