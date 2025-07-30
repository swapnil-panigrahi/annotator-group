"use client"

import NavigationBar from "../components/NavigationBar"
import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from "next/navigation"

interface Summary {
  id: string;
  text: string;
  summary: string;
  pmid?: string;
  level?: string;
  summaryType?: string;
  abstractId?: string;
  assigned_at: string;
  completed: boolean;
  annotationId?: string;
}

interface Annotation {
  comprehensiveness: number;
  readability: number;
  factuality: number;
  usefulness: number;
}

const PAGE_SIZE = 3

export default function RankingPage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [isAbstractOpen, setIsAbstractOpen] = useState(false)
  
  // Rating state for each summary
  const [ratings, setRatings] = useState<Record<string, Annotation>>({})
  
  const totalPages = Math.ceil(summaries.length / PAGE_SIZE)
  const startIdx = pageIndex * PAGE_SIZE
  const visibleSummaries = summaries.slice(startIdx, startIdx + PAGE_SIZE)

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

  const fetchUserSummaries = useCallback(async () => {
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
      console.log('Summary IDs:', data.summaries?.map((s: Summary) => s.id) || [])
      setSummaries(data.summaries || [])
    } catch (err) {
      console.error("Error fetching summaries:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch summaries")
    } finally {
      setLoading(false)
    }
  }, [router, supabase.auth])

  const fetchExistingAnnotations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return
      }

      console.log('Fetching existing annotations for user:', session.user.id)

      const response = await fetch('/api/annotations', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        console.log('Failed to fetch existing annotations, status:', response.status)
        return
      }

      const data = await response.json()
      console.log('Fetched existing annotations data:', data)
      
      // Transform the annotations to match our rating format
      const existingRatings: Record<string, Annotation> = {}
      
      if (data.annotations) {
        console.log('Processing annotations:', data.annotations)
        Object.entries(data.annotations).forEach(([summaryId, annotation]: [string, any]) => {
          console.log(`Processing annotation for summary ${summaryId}:`, annotation)
          existingRatings[summaryId] = {
            comprehensiveness: annotation.comprehensiveness || 0,
            readability: annotation.layness || 0, // Map layness back to readability
            factuality: annotation.factuality || 0,
            usefulness: annotation.usefulness || 0
          }
        })
      }
      
      console.log('Final existing ratings:', existingRatings)
      setRatings(existingRatings)
    } catch (err) {
      console.error("Error fetching existing annotations:", err)
    }
  }, [supabase.auth])

  useEffect(() => {
    fetchUserSummaries()
  }, [fetchUserSummaries])

  // Fetch existing annotations after summaries are loaded
  useEffect(() => {
    if (summaries.length > 0) {
      fetchExistingAnnotations()
    }
  }, [summaries, fetchExistingAnnotations])

  const handleNavigate = (idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      setPageIndex(idx)
    }
  }

  const handleRatingChange = (summaryId: string, aspect: keyof Annotation, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [summaryId]: {
        ...prev[summaryId],
        [aspect]: rating
      }
    }))
  }

  const handleSubmit = async () => {
    try {
      // Submit annotations for all visible summaries
      const submitPromises = visibleSummaries.map(async (summary) => {
        const summaryRatings = ratings[summary.id] || {
          comprehensiveness: 0,
          readability: 0,
          factuality: 0,
          usefulness: 0
        }

        const response = await fetch('/api/annotate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summaryId: summary.id,
            abstractId: summary.abstractId,
            comprehensiveness: summaryRatings.comprehensiveness,
            layness: summaryRatings.readability, // Map readability to layness
            factuality: summaryRatings.factuality,
            usefulness: 0 // Always set to 0 as requested
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit annotation for summary ${summary.id}`)
        }

        return response.json()
      })

      await Promise.all(submitPromises)
      alert('Annotations submitted successfully!')
      
      // Don't clear ratings - keep them displayed
      // const newRatings = { ...ratings }
      // visibleSummaries.forEach(summary => {
      //   delete newRatings[summary.id]
      // })
      // setRatings(newRatings)
      
    } catch (error) {
      console.error("Error submitting annotations:", error)
      alert("Failed to submit annotations. Please try again.")
    }
  }

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

  // Check if all visible summaries have complete ratings
  const isSubmitDisabled = visibleSummaries.some(summary => {
    const summaryRatings = ratings[summary.id] || {
      comprehensiveness: 0,
      readability: 0,
      factuality: 0,
      usefulness: 0
    }
    const isIncomplete = summaryRatings.comprehensiveness === 0 || 
           summaryRatings.readability === 0 || 
           summaryRatings.factuality === 0
    
    console.log(`Summary ${summary.id} ratings:`, summaryRatings, 'Incomplete:', isIncomplete)
    return isIncomplete
  })

  // Count total required ratings and completed ratings for better feedback
  const totalRequiredRatings = visibleSummaries.length * 3 // 3 aspects per summary
  const completedRatings = visibleSummaries.reduce((total, summary) => {
    const summaryRatings = ratings[summary.id] || {
      comprehensiveness: 0,
      readability: 0,
      factuality: 0,
      usefulness: 0
    }
    const completed = (summaryRatings.comprehensiveness > 0 ? 1 : 0) + 
                     (summaryRatings.readability > 0 ? 1 : 0) + 
                     (summaryRatings.factuality > 0 ? 1 : 0)
    return total + completed
  }, 0)

  console.log('Current ratings state:', ratings)
  console.log('Visible summaries:', visibleSummaries.map(s => s.id))
  console.log('Submit button disabled:', isSubmitDisabled)
  console.log(`Ratings progress: ${completedRatings}/${totalRequiredRatings}`)

  // Assigned info for the first summary in the current page
  const first = visibleSummaries[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p>Loading summaries...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Summaries Assigned</h2>
          <p className="text-gray-600">You don't have any summaries assigned to you yet.</p>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-100 py-2 px-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-grow">
            {/* Menu toggle button on the left */}
            <button
              className="mr-4 p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 focus:outline-none"
              onClick={() => setIsAbstractOpen(true)}
              aria-label="Show Abstract"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
                <line x1="9" y1="12" x2="15" y2="12"></line>
              </svg>
            </button>
            <h1 className="text-lg font-bold whitespace-nowrap flex-shrink-0">Group Annotation</h1>
            <div className="flex-grow max-w-[calc(100%-350px)]">
              <NavigationBar
                currentIndex={pageIndex}
                totalItems={totalPages}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
          
          {/* Progress and Guidelines */}
          <div className="flex items-center gap-4">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">
                Progress: {completedRatings} / {totalRequiredRatings}
              </span>
              <Progress value={(completedRatings / totalRequiredRatings) * 100} className="w-20 sm:w-32 h-2" />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {totalRequiredRatings > 0 ? Math.round((completedRatings / totalRequiredRatings) * 100) : 0}%
              </span>
            </div>
            
            {/* Guidelines Link */}
            <a
              href="/guidelines.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center whitespace-nowrap"
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
            
            {/* Logout button on the top right */}
            <Button
              onClick={handleLogout}
              size="sm"
              className="ml-4"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      {/* Assigned on and Level info only above the left column */}
      <div className="bg-gray-50 px-4 py-2 border-b flex gap-4 items-center">
        {first && (
          <div className="flex flex-col gap-1">
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              Assigned on: {new Date(first.assigned_at).toLocaleDateString()}
            </div>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Level: {first.level}
            </div>
          </div>
        )}
      </div>
      <main className="flex-grow overflow-hidden flex flex-col lg:flex-row">
        {visibleSummaries.map((summary, idx) => {
          const summaryRatings = ratings[summary.id] || {
            comprehensiveness: 0,
            readability: 0,
            factuality: 0,
            usefulness: 0
          }

          return (
            <div key={summary.id} className="lg:w-1/3 h-full overflow-y-auto p-4 border-r:last:border-r-0 flex flex-col">
              <label className="mb-2 text-sm font-semibold">Summary</label>
              <textarea
                className="border rounded-lg p-3 min-h-[200px] flex-1 bg-white"
                value={summary.summary}
                readOnly
              />
              
              {/* Rating sections */}
              <div className="mt-4 space-y-4">
                {/* Comprehensiveness */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Comprehensiveness</Label>
                  <div className="flex justify-start space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleRatingChange(summary.id, 'comprehensiveness', rating)}
                          className={`h-3 w-3 rounded-full ${
                            summaryRatings.comprehensiveness === rating 
                              ? 'bg-primary border border-primary' 
                              : 'border border-primary'
                          }`}
                          aria-checked={summaryRatings.comprehensiveness === rating}
                        />
                        <Label className="ml-1 mr-1 text-xs">{rating}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Readability */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Readability</Label>
                  <div className="flex justify-start space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleRatingChange(summary.id, 'readability', rating)}
                          className={`h-3 w-3 rounded-full ${
                            summaryRatings.readability === rating 
                              ? 'bg-primary border border-primary' 
                              : 'border border-primary'
                          }`}
                          aria-checked={summaryRatings.readability === rating}
                        />
                        <Label className="ml-1 mr-1 text-xs">{rating}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Factuality */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Factuality</Label>
                  <div className="flex justify-start space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <div key={rating} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleRatingChange(summary.id, 'factuality', rating)}
                          className={`h-3 w-3 rounded-full ${
                            summaryRatings.factuality === rating 
                              ? 'bg-primary border border-primary' 
                              : 'border border-primary'
                          }`}
                          aria-checked={summaryRatings.factuality === rating}
                        />
                        <Label className="ml-1 mr-1 text-xs">{rating}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </main>
      {/* Sticky footer with submit button */}
      <footer className="bg-gray-100 pt-2 pb-3 px-4 sticky bottom-0 z-10">
        <div className="flex flex-col gap-2">
          {/* Progress indicator */}
          <div className="text-center text-sm text-gray-600">
            {completedRatings === totalRequiredRatings ? (
              <span className="text-green-600 font-medium">✓ All ratings completed</span>
            ) : (
              <span className="text-orange-600">
                {completedRatings} of {totalRequiredRatings} ratings completed
              </span>
            )}
          </div>
          
          {/* Submit button */}
          <Button
            type="button"
            className="w-full"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
          >
            {isSubmitDisabled ? `Complete all ${totalRequiredRatings} ratings to submit` : 'Submit'}
          </Button>
        </div>
      </footer>
      {/* Sliding abstract drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${isAbstractOpen ? 'translate-x-0' : '-translate-x-full'} w-full max-w-2xl bg-white shadow-lg border-r flex flex-col`} style={{ pointerEvents: isAbstractOpen ? 'auto' : 'none' }}>
        <div className="relative p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Abstract</h2>
            <button
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              onClick={() => setIsAbstractOpen(false)}
              aria-label="Close Abstract"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Abstract content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {/* Abstract text */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Abstract Text</h3>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {first?.text || 'No abstract available'}
                  </p>
                </div>
              </div>

              {/* Abstract metadata */}
              {first && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Abstract Details</h3>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="space-y-2 text-sm">
                      {first.pmid && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20">PMID:</span>
                          <span className="text-gray-800">{first.pmid}</span>
                        </div>
                      )}
                      {first.level && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20">Level:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {first.level}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-20">Assigned:</span>
                        <span className="text-gray-800">
                          {new Date(first.assigned_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="space-y-2 text-sm text-gray-800">
                    <p className="font-medium">Rate each summary on three aspects:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Comprehensiveness:</strong> How complete is the summary?</li>
                      <li><strong>Readability:</strong> How easy is it to understand?</li>
                      <li><strong>Factuality:</strong> How accurate are the facts?</li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-3">
                      Use the 1-5 scale where 1 = poor and 5 = excellent
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t mt-4">
            <p className="text-xs text-gray-500 text-center">
              Complete all ratings to submit your annotations
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 