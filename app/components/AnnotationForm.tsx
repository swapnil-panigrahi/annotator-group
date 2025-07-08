"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { InfoIcon as InfoCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type React from "react"

// Define Label type for consistency
interface Label {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  correctedText?: string;
}

// Define Annotation type
interface Annotation {
  comprehensiveness: number;
  layness: number;
  factuality: number;
  usefulness: number;
  labels: Label[];
}

interface AnnotationFormProps {
  textId: string
  onAnnotationChange: (annotation: Annotation) => void
  initialAnnotation: Annotation
  labels?: Label[]
  readOnly?: boolean // NEW: readOnly prop
}

interface AspectRating {
  name: string
  stateKey: keyof Annotation
  label: string
  description: string
}

const initialState: Annotation = {
  comprehensiveness: 0,
  layness: 0,
  factuality: 0,
  usefulness: 0,
  labels: []
}

const aspects: AspectRating[] = [
  {
    name: "Comprehensiveness",
    stateKey: "comprehensiveness",
    label: "Comprehensiveness",
    description: "How well does the summary cover all the necessary information to understand the abstract?",
  },
  {
    name: "Layness",
    stateKey: "layness",
    label: "Layness",
    description: "How easy is it for a non-expert to understand the summary?",
  },
  {
    name: "Factuality",
    stateKey: "factuality",
    label: "Factuality",
    description: "How accurately does the summary represent the facts from the original text?",
  },
  {
    name: "Usefulness",
    stateKey: "usefulness",
    label: "Usefulness",
    description: "How valuable is this summary as per your knowledge level?",
  },
]

export default function AnnotationForm({ textId, onAnnotationChange, initialAnnotation, labels, readOnly = false }: AnnotationFormProps) {
  const [ratings, setRatings] = useState(initialAnnotation)
  const isFirstRender = useRef(true)
  const userChangedRating = useRef(false)

  // Sync ratings when initialAnnotation changes (from parent)
  useEffect(() => {
    setRatings(initialAnnotation)
    userChangedRating.current = false
  }, [initialAnnotation])

  const handleRatingChange = useCallback(
    (aspect: keyof Annotation, rating: number) => {
      userChangedRating.current = true
      setRatings((prev) => {
        return { ...prev, [aspect]: rating }
      })
    },
    [],
  )
  
  // Use separate effect to call onAnnotationChange when ratings change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Only notify parent component if the user actually changed something
    if (userChangedRating.current) {
      onAnnotationChange(ratings)
    }
  }, [ratings, onAnnotationChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm("Are you sure you want to submit this annotation?")) {
      try {
        const response = await fetch("/api/annotate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            textId,
            comprehensiveness: ratings.comprehensiveness,
            layness: ratings.layness,
            factuality: ratings.factuality,
            usefulness: ratings.usefulness,
            labels
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit annotation")
        }

        alert("Annotation submitted successfully!")
      } catch (error) {
        console.error("Error submitting annotation:", error)
        alert("Failed to submit annotation. Please try again.")
      }
    }
  }

  // Add handler to stop propagation of arrow key events
  const handleRadioKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.stopPropagation();
    }
  }, []);

  // Use a custom click handler instead of onValueChange to avoid arrow key navigation
  const handleRatingClick = useCallback(
    (aspect: keyof Annotation, rating: number) => {
      userChangedRating.current = true
      setRatings((prev) => {
        // Toggle rating if clicking the same value again
        const newRating = prev[aspect] === rating ? 0 : rating;
        return { ...prev, [aspect]: newRating }
      })
      
      // Blur focus from the active element after selecting a rating
      // This allows arrow keys to navigate between summaries again
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 10);
    },
    [],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {aspects.map((aspect) => (
          <div key={aspect.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{aspect.label}</Label>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4" type="button" disabled={readOnly}>
                      <InfoCircle className="h-3 w-3" />
                      <span className="sr-only">Info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-wrap text-xs">
                    <p>{aspect.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex justify-start space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => !readOnly && handleRatingClick(aspect.stateKey, rating)}
                    className={`h-3 w-3 rounded-full ${
                      ratings[aspect.stateKey] === rating 
                        ? 'bg-primary border border-primary' 
                        : 'border border-primary'
                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-checked={ratings[aspect.stateKey] === rating}
                    disabled={readOnly}
                  />
                  <Label className="ml-1 mr-1 text-xs">{rating}</Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <Button type="submit" className="w-full" size="sm">
          Submit Annotation
        </Button>
      )}
    </form>
  )
}

