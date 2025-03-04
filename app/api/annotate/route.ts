import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const LabelSchema = z.object({
  text: z.string(),
  type: z.string(),
  startIndex: z.number(),
  endIndex: z.number()
})

const AnnotationSchema = z.object({
  textId: z.string(),
  comprehensiveness: z.number().min(1).max(5),
  layness: z.number().min(1).max(5),
  factuality: z.number().min(1).max(5),
  usefulness: z.number().min(1).max(5),
  labels: z.array(LabelSchema).optional()
})

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = AnnotationSchema.parse(body)

    // Save annotation to database using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update the annotation
      const annotation = await tx.annotation.upsert({
        where: {
          userId_textSummaryId: {
            userId: session.user.id,
            textSummaryId: validatedData.textId
          }
        },
        update: {
          comprehensiveness: validatedData.comprehensiveness,
          layness: validatedData.layness,
          factuality: validatedData.factuality,
          usefulness: validatedData.usefulness,
          labels: validatedData.labels as unknown as Prisma.JsonValue
        },
        create: {
          userId: session.user.id,
          textSummaryId: validatedData.textId,
          comprehensiveness: validatedData.comprehensiveness,
          layness: validatedData.layness,
          factuality: validatedData.factuality,
          usefulness: validatedData.usefulness,
          labels: validatedData.labels as unknown as Prisma.JsonValue
        }
      })

      // Update the user-summary assignment
      await tx.userSummary.update({
        where: {
          userId_summaryId: {
            userId: session.user.id,
            summaryId: validatedData.textId
          }
        },
        data: {
          completed: true,
          annotationId: annotation.id
        }
      })

      return annotation
    })

    return NextResponse.json({ success: true, annotation: result })
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
