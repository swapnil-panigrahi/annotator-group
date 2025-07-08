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

    // Fetch user's assigned summaries starting from UserSummary table
    const userSummaries = await prisma.userSummary.findMany({
      where: {
        userId: targetUserId,
        assignedAt: {
          gte: windowStart,
        },
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

    console.log(`Found ${userSummaries.length} summaries for user`)

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
  } catch (error) {
    console.error("Error fetching summaries:", error)
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    )
  }
}

