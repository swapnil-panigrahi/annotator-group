import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

    // Parse userId param
    const url = new URL(request.url)
    const userIdParam = url.searchParams.get('userId')

    // Check if current user is admin
    const settings = await prisma.settings.findUnique({ where: { userId: session.user.id }, select: { isAdmin: true, summaryWindowDays: true } })
    const isAdmin = !!settings?.isAdmin
    console.log("settings:", settings)
    const summaryWindowDays = settings?.summaryWindowDays ?? 7
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - summaryWindowDays)

    // Use userId param if admin, else session user
    const targetUserId = (isAdmin && userIdParam) ? userIdParam : session.user.id

    console.log("Fetching summaries for user:", targetUserId)

    // For admins, do not apply summary window
    const assignedAtFilter = isAdmin && userIdParam ? {} : { gte: windowStart };

    try {
      // Try to fetch from new group tables first
      console.log("Attempting to fetch from group tables...")
      
      const userGroupAssignments = await prisma.userGroup.findMany({
        where: {
          userID: targetUserId,
          assignedAt: assignedAtFilter,
        },
        select: {
          id: true,
          assignedAt: true,
          completed: true,
          abstractID: true,
          summaryID: true,
          annotationID: true,
          abstract: {
            select: {
              id: true,
              abstractText: true,
              pmid: true,
              level: true,
              created_at: true,
            }
          },
          summary: {
            select: {
              id: true,
              summaryType: true,
              summary: true,
              created_at: true,
            }
          }
        },
        orderBy: [
          { assignedAt: 'asc' },
          { abstract: { abstractText: 'asc' } },
        ]
      })

      console.log(`Found ${userGroupAssignments.length} group assignments for user`)

      // Group assignments by abstract to get 3 summaries per abstract
      const abstractGroups = new Map()
      
      userGroupAssignments.forEach(assignment => {
        const abstractId = assignment.abstractID
        if (!abstractGroups.has(abstractId)) {
          abstractGroups.set(abstractId, {
            abstract: assignment.abstract,
            summaries: [],
            assignments: []
          })
        }
        
        const group = abstractGroups.get(abstractId)
        group.summaries.push(assignment.summary)
        group.assignments.push(assignment)
      })

      // Transform the data to match the expected format for ranking page
      const formattedSummaries = []
      
      for (const [abstractId, group] of abstractGroups) {
        // Create one entry per summary in the group
        group.summaries.forEach((summary, index) => {
          const assignment = group.assignments[index]
          formattedSummaries.push({
            id: summary.id,
            text: group.abstract.abstractText,
            summary: summary.summary,
            pmid: group.abstract.pmid,
            level: group.abstract.level,
            summaryType: summary.summaryType,
            abstractId: abstractId,
            assigned_at: assignment.assignedAt,
            completed: assignment.completed,
            annotationId: assignment.annotationID
          })
        })
      }

      return NextResponse.json({ summaries: formattedSummaries })

    } catch (groupError) {
      console.log("Group tables not available, falling back to old system:", groupError)
      
      // Fallback to old system
      const userSummaries = await prisma.userSummary.findMany({
        where: {
          userId: targetUserId,
          assignedAt: assignedAtFilter,
        },
        select: {
          id: true,
          assignedAt: true,
          completed: true,
          textSummary: {
            select: {
              id: true,
              text: true,
              summary: true,
              pmid: true,
              level: true,
              model: true,
            }
          }
        },
        orderBy: [
          { textSummary: { text: 'asc' } } ,
          { textSummary: { level: 'asc' } },
        ]
      })

      console.log(`Found ${userSummaries.length} summaries for user (fallback)`)

      // Transform the data to match the expected format
      const formattedSummaries = userSummaries.map(userSummary => ({
        id: userSummary.textSummary.id,
        text: userSummary.textSummary.text,
        summary: userSummary.textSummary.summary,
        pmid: userSummary.textSummary.pmid,
        level: userSummary.textSummary.level,
        model: userSummary.textSummary.model,
        assigned_at: userSummary.assignedAt,
        completed: userSummary.completed
      }))

      return NextResponse.json({ summaries: formattedSummaries })
    }

  } catch (error) {
    console.error("Error fetching summaries:", error)
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    )
  }
}

