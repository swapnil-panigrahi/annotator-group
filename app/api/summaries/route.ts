import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
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
      console.error("Auth error:", authError)
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      )
    }

    if (!session?.user?.id) {
      console.error("No session or user ID")
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      )
    }

    console.log("Fetching summaries for user:", session.user.id)

    // Fetch user's assigned summaries starting from UserSummary table
    const userSummaries = await prisma.userSummary.findMany({
      where: {
        userId: session.user.id
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
        { assignedAt: 'asc' },
        { completed: 'desc' }
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
