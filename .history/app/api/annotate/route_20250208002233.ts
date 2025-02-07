import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { z } from "zod"

const AnnotationSchema = z.object({
  textId: z.string(),
  comprehensiveness: z.number().min(1).max(5),
  layness: z.number().min(1).max(5),
  factuality: z.number().min(1).max(5),
  usefulness: z.number().min(1).max(5),
})

export async function POST(request: Request) {
  try {
    // Check authentication
    const userCookie = cookies().get("user")
    if (!userCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = JSON.parse(userCookie.value)
    const body = await request.json()
    
    // Validate request body
    const validatedData = AnnotationSchema.parse(body)

    // Save annotation to database with schema-matching field names
    const annotation = await prisma.annotation.create({
      data: {
        userId: user.id,
        textSummaryId: validatedData.textId,
        feature1: validatedData.comprehensiveness,
        feature2: validatedData.layness,
        feature3: validatedData.factuality,
        feature4: validatedData.usefulness,
      },
    })

    return NextResponse.json({ success: true, annotation })
  } catch (error) {
    console.error("Annotation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to save annotation" },
      { status: 500 }
    )
  }
}
