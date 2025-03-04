import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma Client
const prisma = new PrismaClient()

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

    // Fetch user's assigned summaries with Prisma
    const summaries = await prisma.textSummary.findMany({
      where: {
        userAssignments: {
          some: {
            userId: session.user.id
          }
        }
      },
      select: {
        id: true,
        text: true,
        summary: true,
        level: true,
        model: true,
        userAssignments: {
          where: {
            userId: session.user.id
          },
          select: {
            assignedAt: true,
            completed: true
          }
        }
      }
    })

    console.log(`Found ${summaries.length} summaries for user`)

    // Transform the data to match the expected format
    const formattedSummaries = summaries.map(summary => ({
      id: summary.id,
      text: summary.text,
      summary: summary.summary,
      level: summary.level,
      model: summary.model,
      assigned_at: summary.userAssignments[0]?.assignedAt,
      completed: summary.userAssignments[0]?.completed
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