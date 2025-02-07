"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AnnotationFormProps {
  textId: string
  onAnnotationChange: (annotation: typeof initialState) => void
  initialAnnotation: typeof initialState
}

interface AspectRating {
  name: string
  stateKey: keyof typeof initialState
  label: string
}

const initialState = {
  comprehensiveness: 0,
  laymanFriendliness: 0,
  factuality: 0,
  usefulness: 0,
}

const aspects: AspectRating[] = [
  { name: "Comprehensiveness", stateKey: "comprehensiveness", label: "Comprehensiveness" },
  { name: "LaymanFriendliness", stateKey: "laymanFriendliness", label: "Layman-friendliness" },
  { name: "Factuality", stateKey: "factuality", label: "Factuality" },
  { name: "Usefulness", stateKey: "usefulness", label: "Usefulness" },
]

export default function AnnotationForm({ textId, onAnnotationChange, initialAnnotation }: AnnotationFormProps) {
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
    try {
      const response = await fetch("http://localhost:5000/api/annotate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textId,
          ...ratings,
        }),
      })
      if (response.ok) {
        alert("Annotation submitted successfully!")
      } else {
        throw new Error("Failed to submit annotation")
      }
    } catch (error) {
      console.error("Error submitting annotation:", error)
      alert("Failed to submit annotation. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aspects.map((aspect) => (
          <div key={aspect.name} className="space-y-2">
            <Label>{aspect.label}</Label>
            <RadioGroup
              onValueChange={(value) => handleRatingChange(aspect.stateKey, Number(value))}
              value={ratings[aspect.stateKey].toString()}
            >
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex items-center space-x-1">
                    <RadioGroupItem value={rating.toString()} id={`${aspect.name}-${rating}`} />
                    <Label htmlFor={`${aspect.name}-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full">
        Submit Annotation
      </Button>
    </form>
  )
}

