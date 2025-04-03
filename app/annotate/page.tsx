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
import { number } from "zod"

interface Label {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  correctedText?: string;
}

interface Annotation {
  comprehensiveness: number;
  layness: number;
  factuality: number;
  usefulness: number;
  labels: Label[];
}

interface Summary {
  id: string;
  text: string;
  summary: string;
  pmid?: string;
  assigned_at: string;
  completed: boolean;
}

export default function AnnotatePage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAnnotations, setLoadingAnnotations] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [allAnnotationsLoaded, setAllAnnotationsLoaded] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation>({
    comprehensiveness: 0,
    layness: 0,
    factuality: 0,
    usefulness: 0,
    labels: []
  })

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
      setSummaries(data.summaries || [])
    } catch (err) {
      console.error("Error fetching summaries:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch summaries")
    } finally {
      setLoading(false)
    }
  }, [router, supabase.auth])

  const fetchAllAnnotations = useCallback(async () => {
    setLoadingAnnotations(true);
    try {
      console.log('Fetching all annotations...');
      
      const response = await fetch('/api/annotations', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, redirecting to login...');
          router.push('/login');
          return;
        }
        console.error('Failed to fetch annotations, status:', response.status);
        return;
      }

      // Clone the response and log the raw JSON to debug
      const responseClone = response.clone();
      const rawData = await responseClone.text();
      console.log('Raw annotation response:', rawData);
      
      const data = await response.json();
      console.log('Parsed annotation data:', data);
      
      const userAnnotations = data.annotations || {};
      
      console.log('Loaded all annotations:', userAnnotations);
      console.log('Annotation keys:', Object.keys(userAnnotations));
      if (Object.keys(userAnnotations).length > 0) {
        console.log('First annotation sample:', Object.values(userAnnotations)[0]);
      } else {
        console.log('No annotations found in response');
      }
      
      setAllAnnotationsLoaded(true);
      
      return userAnnotations;
    } catch (err) {
      console.error("Error fetching annotations:", err);
      return {};
    } finally {
      setLoadingAnnotations(false);
    }
  }, [router]);

  // Fetch both summaries and annotations on mount
  useEffect(() => {
    const loadData = async () => {
      console.log('Starting to load data...');
      
      try {
        // Step 1: Fetch summaries from the API
        await fetchUserSummaries();
        // We do not use the summaries state here directly since it might not be updated yet
        
        // Step 2: Fetch all annotations in a separate effect that runs when summaries change
      } catch (error) {
        console.error("Error in initial data loading:", error);
      }
    };
    
    loadData();
  }, [fetchUserSummaries]);
  
  // This effect runs when summaries change
  useEffect(() => {
    const loadAnnotations = async () => {
      if (summaries.length === 0) {
        console.log('No summaries available yet, skipping annotation loading');
        return;
      }
      
      console.log('Summaries are now available:', summaries.length);
      
      // Now that we have summaries, fetch annotations
      const userAnnotations = await fetchAllAnnotations();
      console.log('User annotations after fetch:', userAnnotations);
      
      console.log('Creating initial annotations for', summaries.length, 'summaries');
      // Initialize annotations array with default values for all summaries
      const initialAnnotations = summaries.map((summary) => {
        // Use existing annotation if available, otherwise use default values
        const existingAnnotation = userAnnotations?.[summary.id];
        console.log(`Checking annotation for summary ${summary.id}:`, existingAnnotation);
        
        if (existingAnnotation) {
          console.log('Using existing annotation');
          return {
            comprehensiveness: existingAnnotation.comprehensiveness || 0,
            layness: existingAnnotation.layness || 0,
            factuality: existingAnnotation.factuality || 0,
            usefulness: existingAnnotation.usefulness || 0,
            labels: existingAnnotation.labels || []
          };
        } else {
          console.log('Creating new annotation');
          return {
            comprehensiveness: 0,
            layness: 0,
            factuality: 0,
            usefulness: 0,
            labels: []
          };
        }
      });
      
      console.log('Setting annotations:', initialAnnotations);
      setAnnotations(initialAnnotations);
      
      // Initialize currentAnnotation with the first annotation
      if (initialAnnotations.length > 0) {
        console.log('Setting current annotation:', initialAnnotations[0]);
        setCurrentAnnotation(initialAnnotations[0]);
      }
    };
    
    loadAnnotations();
  }, [summaries, fetchAllAnnotations]);

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

  // Submit an annotation
  const saveAnnotation = useCallback(async (annotation: Annotation) => {
    // Only save if we have a valid summary and user is authenticated
    if (!summaries.length || currentIndex < 0) return;
    
    const currentSummary = summaries[currentIndex];
    
    try {
      const response = await fetch('/api/annotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textId: currentSummary.id,
          comprehensiveness: annotation.comprehensiveness,
          layness: annotation.layness,
          factuality: annotation.factuality,
          usefulness: annotation.usefulness,
          labels: annotation.labels
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save annotation');
      }

      console.log('Annotation saved successfully');
    } catch (err) {
      console.error("Error saving annotation:", err);
    }
  }, [summaries, currentIndex]);

  // Wrap handleAnnotationChange in useCallback
  const handleAnnotationChange = useCallback((annotation: Annotation) => {
    setAnnotations((prevAnnotations) => {
      const newAnnotations = [...prevAnnotations];
      
      // Make sure we have enough items in the array
      while (newAnnotations.length <= currentIndex) {
        newAnnotations.push({
          comprehensiveness: 0,
          layness: 0,
          factuality: 0,
          usefulness: 0,
          labels: []
        });
      }
      
      // Update the annotation at current index
      newAnnotations[currentIndex] = {
        ...annotation,
        // Ensure labels is always an array, even if missing from the annotation parameter
        labels: annotation.labels || []
      };
      
      return newAnnotations;
    });
    
    // Save to DB
    saveAnnotation(annotation);
  }, [currentIndex, saveAnnotation]);

  const handleAddLabel = useCallback(
    (labelType: string, selectedText: string, startIndex: number, endIndex: number, correctedText: string) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations];
        
        // Make sure we have enough items in the array
        while (newAnnotations.length <= currentIndex) {
          newAnnotations.push({
            comprehensiveness: 0,
            layness: 0,
            factuality: 0,
            usefulness: 0,
            labels: []
          });
        }
        
        const annotation = newAnnotations[currentIndex] || {
          comprehensiveness: 0,
          layness: 0,
          factuality: 0,
          usefulness: 0,
          labels: []
        };
        
        newAnnotations[currentIndex] = {
          ...annotation,
          labels: [
            ...(annotation.labels || []),
            { text: selectedText, type: labelType, startIndex, endIndex, correctedText }
          ]
        };
        
        setCurrentAnnotation(newAnnotations[currentIndex]);
        return newAnnotations;
      });
    },
    [currentIndex],
  )

  const handleDeleteLabel = useCallback(
    (labelIndex: number) => {
      setAnnotations((prevAnnotations) => {
        const newAnnotations = [...prevAnnotations];
        
        // Make sure we have enough items in the array
        while (newAnnotations.length <= currentIndex) {
          newAnnotations.push({
            comprehensiveness: 0,
            layness: 0,
            factuality: 0,
            usefulness: 0,
            labels: []
          });
        }
        
        const annotation = newAnnotations[currentIndex] || {
          comprehensiveness: 0,
          layness: 0,
          factuality: 0,
          usefulness: 0,
          labels: []
        };
        
        if (annotation.labels) {
          newAnnotations[currentIndex] = {
            ...annotation,
            labels: annotation.labels.filter((_, index) => index !== labelIndex)
          };
          setCurrentAnnotation(newAnnotations[currentIndex]);
        }
        
        return newAnnotations;
      });
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

  // Update this function to use our cached annotations data
  const fetchAnnotationForSummary = useCallback(async (summaryId: string) => {
    // Skip API call entirely since we already have all annotations cached
    // This function is maintained for API compatibility but now just sets loading to false
    setLoadingAnnotations(false);
  }, []);

  // Modified to better handle already loaded annotations
  useEffect(() => {
    if (summaries.length > 0 && currentIndex >= 0) {
      console.log(`currentIndex changed to ${currentIndex}, updating current annotation`);
      console.log('Current annotations array length:', annotations.length);
      
      // If we have annotations loaded
      if (annotations.length > 0) {
        // If the currentIndex is valid
        if (currentIndex < annotations.length) {
          console.log('Setting currentAnnotation from existing annotations:', annotations[currentIndex]);
          setCurrentAnnotation(annotations[currentIndex]);
        } 
        // If we need to expand the annotations array
        else {
          console.log('currentIndex exceeds annotations array length, expanding array');
          setAnnotations(prev => {
            // Create a new array with enough elements
            const newAnnotations = [...prev];
            
            // Fill in missing slots with default annotations
            while (newAnnotations.length <= currentIndex) {
              newAnnotations.push({
                comprehensiveness: 0,
                layness: 0,
                factuality: 0,
                usefulness: 0,
                labels: []
              });
            }
            
            // Set the current annotation to the newly created one
            const newCurrentAnnotation = newAnnotations[currentIndex];
            console.log('Setting currentAnnotation to new default:', newCurrentAnnotation);
            setCurrentAnnotation(newCurrentAnnotation);
            
            return newAnnotations;
          });
        }
      } 
      // If annotations aren't loaded yet, initialize with default values
      else {
        console.log('No annotations loaded yet, using default values');
        setCurrentAnnotation({
          comprehensiveness: 0,
          layness: 0,
          factuality: 0,
          usefulness: 0,
          labels: []
        });
      }
    }
  }, [currentIndex, annotations, summaries.length]);

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

  // Calculate annotated count by checking if all numeric fields are filled
  const annotatedCount = annotations.filter((a) => {
    const numericFields = [a.comprehensiveness, a.layness, a.factuality, a.usefulness];
    return numericFields.every(v => v !== 0);
  }).length;

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
        {loading || loadingAnnotations ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            <span className="ml-2 text-sm text-gray-600">Loading annotations...</span>
          </div>
        ) : (
          <AnnotationForm
            textId={currentSummary.id}
            onAnnotationChange={handleAnnotationChange}
            initialAnnotation={currentAnnotation}
            labels={currentAnnotation.labels}
          />
        )}
      </footer>
    </div>
  )
}

