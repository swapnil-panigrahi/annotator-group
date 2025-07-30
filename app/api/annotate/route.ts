import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

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
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) {
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No active session" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Received annotation request:", body)
    const { textId, comprehensiveness, layness, factuality, usefulness, labels, abstractId, summaryId } = body

    // Check if this is a group annotation (has abstractId and summaryId)
    if (abstractId && summaryId) {
      try {
        console.log("Attempting group annotation for:", { userID: session.user.id, summaryID: summaryId, abstractID: abstractId })
        
        // First, check if annotation already exists
        const existingAnnotation = await prisma.annotationGroup.findFirst({
          where: {
            userID: session.user.id,
            summaryID: summaryId
          }
        })

        let annotationGroup
        if (existingAnnotation) {
          // Update existing annotation
          annotationGroup = await prisma.annotationGroup.update({
            where: { id: existingAnnotation.id },
            data: {
              comprehensiveness: comprehensiveness || 0,
              layness: layness || 0,
              factuality: factuality || 0,
              updated_at: new Date()
            }
          })
        } else {
          // Create new annotation
          annotationGroup = await prisma.annotationGroup.create({
            data: {
              userID: session.user.id,
              abstractID: abstractId,
              summaryID: summaryId,
              comprehensiveness: comprehensiveness || 0,
              layness: layness || 0,
              factuality: factuality || 0
            }
          })
        }

        console.log("Created/updated annotation group:", annotationGroup.id)

        // Update UserGroup to mark as completed
        await prisma.userGroup.updateMany({
          where: {
            userID: session.user.id,
            summaryID: summaryId,
            abstractID: abstractId
          },
          data: {
            completed: true,
            annotationID: annotationGroup.id
          }
        })

        console.log("Updated user group assignments")
        return NextResponse.json({ success: true, annotationId: annotationGroup.id })
      } catch (groupError) {
        console.error("Group annotation failed, falling back to individual annotation:", groupError)
        // Fall back to individual annotation if group tables don't exist
        const annotation = await prisma.annotation.upsert({
          where: {
            userId_textSummaryId: {
              userId: session.user.id,
              textSummaryId: summaryId
            }
          },
          update: {
            comprehensiveness: comprehensiveness || 0,
            layness: layness || 0,
            factuality: factuality || 0,
            usefulness: usefulness || 0,
            labels: labels || null,
            updatedAt: new Date()
          },
          create: {
            userId: session.user.id,
            textSummaryId: summaryId,
            comprehensiveness: comprehensiveness || 0,
            layness: layness || 0,
            factuality: factuality || 0,
            usefulness: usefulness || 0,
            labels: labels || null
          }
        })

        return NextResponse.json({ success: true, annotationId: annotation.id })
      }
    } else {
      // Handle individual annotation (existing logic)
      console.log("Handling individual annotation for textId:", textId)
      const annotation = await prisma.annotation.upsert({
        where: {
          userId_textSummaryId: {
            userId: session.user.id,
            textSummaryId: textId
          }
        },
        update: {
          comprehensiveness: comprehensiveness || 0,
          layness: layness || 0,
          factuality: factuality || 0,
          usefulness: usefulness || 0,
          labels: labels || null,
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          textSummaryId: textId,
          comprehensiveness: comprehensiveness || 0,
          layness: layness || 0,
          factuality: factuality || 0,
          usefulness: usefulness || 0,
          labels: labels || null
        }
      })

      // Update UserSummary to mark as completed
      await prisma.userSummary.updateMany({
        where: {
          userId: session.user.id,
          summaryId: textId
        },
        data: {
          completed: true,
          annotationID: annotation.id
        }
      })

      return NextResponse.json({ success: true, annotationId: annotation.id })
    }
  } catch (error) {
    console.error("Error saving annotation:", error)
    return NextResponse.json(
      { error: "Failed to save annotation" },
      { status: 500 }
    )
  }
}
