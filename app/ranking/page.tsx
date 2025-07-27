"use client"

import NavigationBar from "../components/NavigationBar"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from '@supabase/ssr'

// Types for our data
interface TextSummary {
  id: string
  text: string
  summary: string
  pmid?: string
  level?: string
}

interface RankingGroup {
  id: string
  pmid: string
  abstract: string
  createdAt: string
  target: TextSummary
  baseline: TextSummary
  agenetic: TextSummary
}

interface UserRankingTask {
  id: string
  assignedAt: string
  completed: boolean
  rankingGroup: RankingGroup
  ranking?: {
    targetRank: number
    baselineRank: number
    ageneticRank: number
  }
}

interface RankingResponse {
  userRankingTasks: UserRankingTask[]
}

// Simple hash function to generate deterministic ordering based on task ID
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Function to create a deterministic ordering of the summary types
function getDeterministicOrder(taskId: string): Array<'target' | 'baseline' | 'agenetic'> {
  const hash = simpleHash(taskId);
  const types: Array<'target' | 'baseline' | 'agenetic'> = ['target', 'baseline', 'agenetic'];
  
  // Fisher-Yates shuffle with deterministic seed
  for (let i = types.length - 1; i > 0; i--) {
    // Use the hash to determine the swap
    const j = (hash + i) % (i + 1);
    [types[i], types[j]] = [types[j], types[i]];
  }
  
  return types;
}

export default function RankingPage() {
  const router = useRouter()
  const [pageIndex, setPageIndex] = useState(0)
  const [isAbstractOpen, setIsAbstractOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rankingTasks, setRankingTasks] = useState<UserRankingTask[]>([])
  const [rankings, setRankings] = useState<{
    target: number | null
    baseline: number | null
    agenetic: number | null
  }>({
    target: null,
    baseline: null,
    agenetic: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  // Initialize Supabase client
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

  // Load ranking tasks when the component mounts
  useEffect(() => {
    const fetchRankingTasks = async () => {
      try {
        setLoading(true)
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          console.log('No active session, redirecting to login...')
          router.push('/login')
          return
        }
        
        const response = await fetch("/api/ranking", {
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
          throw new Error(`Failed to fetch ranking tasks: ${response.statusText}`)
        }
        
        const data: RankingResponse = await response.json()
        console.log('Fetched ranking tasks:', data)
        
        // Tasks are already sorted on the backend - incomplete first, then by date
        setRankingTasks(data.userRankingTasks)
        
        // If we have tasks, initialize the rankings for the first task
        if (data.userRankingTasks.length > 0) {
          loadRankingsForTask(data.userRankingTasks[0])
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch ranking tasks")
        console.error("Error fetching ranking tasks:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRankingTasks()
  }, [router, supabase.auth])

  // Load user name
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Fetched user:', user)
        
        if (user) {
          // Fetch user name from profiles
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

  // When changing page index, load the appropriate rankings
  useEffect(() => {
    if (rankingTasks.length > 0 && pageIndex >= 0 && pageIndex < rankingTasks.length) {
      loadRankingsForTask(rankingTasks[pageIndex])
    }
  }, [pageIndex, rankingTasks])

  // Helper function to load rankings for a specific task
  const loadRankingsForTask = (task: UserRankingTask) => {
    if (task.ranking) {
      // If we have saved rankings for this task, use them
      setRankings({
        target: task.ranking.targetRank,
        baseline: task.ranking.baselineRank,
        agenetic: task.ranking.ageneticRank,
      })
    } else {
      // Otherwise reset to default
      setRankings({
        target: null,
        baseline: null,
        agenetic: null,
      })
    }
  }

  // Calculate derived state
  const totalPages = rankingTasks.length
  const currentTask = rankingTasks[pageIndex] || null

  // Get a deterministic ordering for the current task
  const summaryOrder = useMemo(() => {
    if (!currentTask) return ['target', 'baseline', 'agenetic'] as const;
    return getDeterministicOrder(currentTask.id);
  }, [currentTask]);

  // Create a mapping from display letter to actual summary type
  const modelMapping = useMemo(() => {
    if (!currentTask) return {} as Record<string, TextSummary>;
    
    return {
      'A': currentTask.rankingGroup[summaryOrder[0]],
      'B': currentTask.rankingGroup[summaryOrder[1]],
      'C': currentTask.rankingGroup[summaryOrder[2]]
    };
  }, [currentTask, summaryOrder]);

  // Create inverse mapping from summary type to display letter
  const summaryToLetter = useMemo(() => {
    const result: Record<string, string> = {};
    if (summaryOrder[0]) result[summaryOrder[0]] = 'A';
    if (summaryOrder[1]) result[summaryOrder[1]] = 'B';
    if (summaryOrder[2]) result[summaryOrder[2]] = 'C';
    return result;
  }, [summaryOrder]);
  
  // Get the current model ranks
  const modelRanks = useMemo(() => {
    if (!currentTask) return { A: null, B: null, C: null };
    return {
      A: summaryOrder[0] ? rankings[summaryOrder[0]] : null,
      B: summaryOrder[1] ? rankings[summaryOrder[1]] : null,
      C: summaryOrder[2] ? rankings[summaryOrder[2]] : null,
    };
  }, [currentTask, summaryOrder, rankings]);
  
  // Handle navigation between ranking tasks
  const handleNavigate = (idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      // Save current rankings before navigating
      if (currentTask && allRanked) {
        saveRankings(false)
      }
      setPageIndex(idx)
    }
  }

  // Calculate completed rankings
  const completedCount = rankingTasks.filter(task => task.completed).length

  // Update ranking for a summary type
  const updateRanking = useCallback((modelLetter: 'A' | 'B' | 'C', rank: number) => {
    if (!currentTask) return;

    // Map the model letter back to the actual summary type
    const summaryType = summaryOrder[['A', 'B', 'C'].indexOf(modelLetter)] as 'target' | 'baseline' | 'agenetic';
    
    setRankings(prev => {
      const newRankings = { ...prev }
      
      // Check if this rank is already assigned to another summary
      Object.entries(newRankings).forEach(([key, value]) => {
        if (key !== summaryType && value === rank) {
          newRankings[key as 'target' | 'baseline' | 'agenetic'] = null
        }
      })
      
      newRankings[summaryType] = rank
      return newRankings
    })
    
    // Save rankings with a slight delay to avoid too many requests
    setTimeout(() => {
      if (currentTask) {
        saveRankings(false)
      }
    }, 500)
  }, [currentTask, summaryOrder])

  // Check if all summaries have been ranked
  const allRanked = rankings.target !== null && 
                    rankings.baseline !== null && 
                    rankings.agenetic !== null

  // Save rankings to the server
  const saveRankings = useCallback(async (markCompleted: boolean = false) => {
    if (!currentTask || !allRanked) return
    
    try {
      setSubmitting(true)
      console.log('Saving rankings:', {
        taskId: currentTask.id,
        targetRank: rankings.target,
        baselineRank: rankings.baseline,
        ageneticRank: rankings.agenetic
      })
      
      // Prepare data for submission
      const response = await fetch("/api/ranking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          taskId: currentTask.id,
          targetRank: rankings.target,
          baselineRank: rankings.baseline,
          ageneticRank: rankings.agenetic,
          markCompleted: markCompleted
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to submit rankings: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('Save result:', result)
      
      // Update local state
      setRankingTasks(prev => 
        prev.map(task => 
          task.id === currentTask.id 
            ? { ...task, 
                completed: markCompleted ? true : task.completed, 
                ranking: { 
                  targetRank: rankings.target!, 
                  baselineRank: rankings.baseline!, 
                  ageneticRank: rankings.agenetic! 
                }
              } 
            : task
        )
      )
      
      if (markCompleted) {
        // Move to next uncompleted task if available
        const nextUncompleted = rankingTasks.findIndex(
          (task, idx) => idx > pageIndex && !task.completed
        )
        
        if (nextUncompleted !== -1) {
          setPageIndex(nextUncompleted)
        } else if (pageIndex >= rankingTasks.length - 1) {
          // If we're on the last task, don't change anything
        } else {
          // Otherwise, just go to the next task
          setPageIndex(pageIndex + 1)
        }
        
        // If all tasks are now complete, show a message
        const remainingTasks = rankingTasks.filter((task, idx) => 
          idx !== pageIndex && !task.completed
        ).length
        
        if (remainingTasks === 0) {
          alert("All ranking tasks completed!");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit rankings")
      console.error("Error submitting rankings:", err)
    } finally {
      setSubmitting(false)
    }
  }, [currentTask, allRanked, rankings, pageIndex, rankingTasks])

  // Handle submission of rankings (mark as completed)
  const handleSubmit = () => {
    saveRankings(true)
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip navigation if target is an input, button, or inside a form
      const target = e.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || 
          target.tagName === 'BUTTON' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' ||
          target.closest('form')) {
        return;
      }
      
      if (e.key === "ArrowLeft") {
        handleNavigate(pageIndex - 1)
      } else if (e.key === "ArrowRight") {
        handleNavigate(pageIndex + 1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pageIndex])

  // Handle logout
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

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading ranking tasks...</div>
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>
  }

  if (rankingTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Ranking Tasks Assigned</h2>
          <p className="text-gray-600 mb-6">You don't have any ranking tasks assigned to you yet.</p>
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
            <h1 className="text-lg font-bold whitespace-nowrap flex-shrink-0">Ranking Page</h1>
            <div className="flex-grow max-w-[calc(100%-350px)]">
              <NavigationBar
                currentIndex={pageIndex}
                totalItems={totalPages}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">
                Progress: {completedCount} / {rankingTasks.length}
              </span>
              <Progress value={(completedCount / rankingTasks.length) * 100} className="w-20 sm:w-32 h-2" />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {Math.round((completedCount / rankingTasks.length) * 100)}%
              </span>
            </div>
            {userName && <span className="text-gray-600 text-sm whitespace-nowrap">Welcome, {userName}</span>}
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
      
      {/* Assigned on and PMID info */}
      <div className="bg-gray-50 px-4 py-2 border-b flex gap-4 items-center justify-between">
        {currentTask && (
          <div className="flex flex-col gap-1">
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              Assigned on: {new Date(currentTask.assignedAt).toLocaleDateString()}
            </div>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              PMID: {currentTask.rankingGroup.pmid}
            </div>
            {/* Remove status indicator as requested */}
          </div>
        )}
        <div className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-full">
          Rank from 1 (Best) to 3 (Worst)
        </div>
      </div>
      
      <main className="flex-grow overflow-hidden flex flex-col lg:flex-row">
        {/* Model A Summary */}
        {currentTask && (
          <>
            <div className="lg:w-1/3 h-full overflow-y-auto p-4 border-r flex flex-col">
              <label className="mb-2 text-sm font-semibold">
                Model A Summary
              </label>
              <textarea
                className="border rounded-lg p-3 min-h-[200px] flex-1 bg-white"
                value={modelMapping['A'].summary}
                readOnly
              />
              {/* Radio buttons group */}
              <div className="mt-4 flex gap-4 items-center">
                {[1, 2, 3].map((val) => (
                  <label key={val} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="model-A-rank"
                      value={val}
                      checked={modelRanks.A === val}
                      onChange={() => updateRanking('A', val)}
                      disabled={submitting}
                    />
                    <span>{val}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Model B Summary */}
            <div className="lg:w-1/3 h-full overflow-y-auto p-4 border-r flex flex-col">
              <label className="mb-2 text-sm font-semibold">
                Model B Summary
              </label>
              <textarea
                className="border rounded-lg p-3 min-h-[200px] flex-1 bg-white"
                value={modelMapping['B'].summary}
                readOnly
              />
              {/* Radio buttons group */}
              <div className="mt-4 flex gap-4 items-center">
                {[1, 2, 3].map((val) => (
                  <label key={val} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="model-B-rank"
                      value={val}
                      checked={modelRanks.B === val}
                      onChange={() => updateRanking('B', val)}
                      disabled={submitting}
                    />
                    <span>{val}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Model C Summary */}
            <div className="lg:w-1/3 h-full overflow-y-auto p-4 flex flex-col">
              <label className="mb-2 text-sm font-semibold">
                Model C Summary
              </label>
              <textarea
                className="border rounded-lg p-3 min-h-[200px] flex-1 bg-white"
                value={modelMapping['C'].summary}
                readOnly
              />
              {/* Radio buttons group */}
              <div className="mt-4 flex gap-4 items-center">
                {[1, 2, 3].map((val) => (
                  <label key={val} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="model-C-rank"
                      value={val}
                      checked={modelRanks.C === val}
                      onChange={() => updateRanking('C', val)}
                      disabled={submitting}
                    />
                    <span>{val}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      
      {/* Sticky footer with submit button */}
      <footer className="bg-gray-100 pt-2 pb-3 px-4 sticky bottom-0 z-10 flex justify-end">
        <Button
          type="button"
          className="w-full"
          disabled={!allRanked || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : currentTask?.completed ? "Update Ranking" : "Submit"}
        </Button>
      </footer>
      
      {/* Sliding abstract drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${isAbstractOpen ? 'translate-x-0' : '-translate-x-full'} w-full max-w-md bg-white shadow-lg border-r flex flex-col`} style={{ pointerEvents: isAbstractOpen ? 'auto' : 'none' }}>
        <div className="relative p-6 flex flex-col h-full">
          <button
            className="absolute top-2 right-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
            onClick={() => setIsAbstractOpen(false)}
            aria-label="Close Abstract"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h2 className="text-lg font-semibold mb-2">Abstract</h2>
          <textarea
            className="border rounded-lg p-3 min-h-[200px] bg-gray-50 resize-none flex-1"
            value={currentTask?.rankingGroup.abstract || ''}
            readOnly
          />
        </div>
      </div>
    </div>
  )
}