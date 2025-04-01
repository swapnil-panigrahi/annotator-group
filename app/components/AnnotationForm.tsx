"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { InfoIcon as InfoCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type React from "react"

interface AnnotationFormProps {
  textId: string
  onAnnotationChange: (annotation: typeof initialState) => void
  initialAnnotation: typeof initialState
  isAllAnnotated: boolean
  labels?: Array<{
    text: string
    type: string
    startIndex: number
    endIndex: number
  }>
}

interface AspectRating {
  name: string
  stateKey: keyof typeof initialState
  label: string
  description: string
}

const initialState = {
  comprehensiveness: 0,
  layness: 0,
  factuality: 0,
  usefulness: 0,
}

const aspects: AspectRating[] = [
  {
    name: "Comprehensiveness",
    stateKey: "comprehensiveness",
    label: "Comprehensiveness",
    description: "Is all necessary information captured in the summary?"
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
    description: "How valuable is this summary for understanding the key points of the original text?",
  },
]

export default function AnnotationForm({ textId, onAnnotationChange, initialAnnotation, isAllAnnotated, labels }: AnnotationFormProps) {
  const [ratings, setRatings] = useState(initialAnnotation)

  useEffect(() => {
    setRatings(initialAnnotation)
  }, [initialAnnotation])

  const handleRatingChange = useCallback(
    (aspect: keyof typeof initialState, rating: number) => {
      setRatings((prev) => {
        const newRatings = { ...prev, [aspect]: rating }
        onAnnotationChange(newRatings)
        return newRatings
      })
    },
    [onAnnotationChange],
  )

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

  const isFormComplete = () => {
    // Only check the numeric rating fields, ignore the labels array
    const ratingFields = ['comprehensiveness', 'layness', 'factuality', 'usefulness'];
    const complete = ratingFields.every(field => ratings[field] >= 1 && ratings[field] <= 5);
    console.log('Ratings:', ratings, 'Complete:', complete, 'All Annotated:', isAllAnnotated);
    return complete && isAllAnnotated;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aspects.map((aspect) => (
          <div key={aspect.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{aspect.label}</Label>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5" type="button">
                      <InfoCircle className="h-4 w-4" />
                      <span className="sr-only">Info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-wrap">
                    <p>{aspect.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              onValueChange={(value) => handleRatingChange(aspect.stateKey, Number(value))}
              value={ratings[aspect.stateKey].toString()}
              className="flex justify-start space-x-1 px-1"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center">
                  <RadioGroupItem value={rating.toString()} id={`${aspect.name}-${rating}`} />
                  <Label htmlFor={`${aspect.name}-${rating}`} className="ml-1 mr-2">
                    {rating}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!isFormComplete()}
        variant={isFormComplete() ? "default" : "secondary"}
      >
        Submit Annotation 
        {!isFormComplete() && ` (${Object.values(ratings).every(rating => rating >= 1 && rating <= 5) ? 'Waiting for all summaries' : 'Complete all ratings'})`}
      </Button>
    </form>
  )
}

