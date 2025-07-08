import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    console.log('GET /api/annotations - Starting request');
    
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
      console.log('GET /api/annotations - Authentication error:', authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log('GET /api/annotations - Authenticated user:', session.user.id);
    
    // Parse query parameters
    const url = new URL(request.url)
    const textId = url.searchParams.get('textId')
    const userIdParam = url.searchParams.get('userId')
    
    // Check if current user is admin
    const settings = await prisma.settings.findUnique({ where: { userId: session.user.id }, select: { isAdmin: true } })
    const isAdmin = !!settings?.isAdmin
    const targetUserId = (isAdmin && userIdParam) ? userIdParam : session.user.id
    
    // If textId is provided, return single annotation
    if (textId) {
      console.log(`GET /api/annotations - Fetching specific annotation for textId: ${textId}`);
      
      const annotation = await prisma.annotation.findUnique({
        where: {
          userId_textSummaryId: {
            userId: targetUserId,
            textSummaryId: textId
          }
        },
        select: {
          comprehensiveness: true,
          layness: true,
          factuality: true,
          usefulness: true,
          labels: true
        }
      })

      console.log(`GET /api/annotations - Result for textId ${textId}:`, annotation);
      
      if (!annotation) {
        return NextResponse.json({ annotation: null })
      }

      return NextResponse.json({ annotation })
    } 
    // If no textId, fetch all annotations for the user
    else {
      console.log('GET /api/annotations - Fetching all annotations for user');
      
      const annotations = await prisma.annotation.findMany({
        where: {
          userId: targetUserId
        },
        select: {
          textSummaryId: true,
          comprehensiveness: true,
          layness: true,
          factuality: true,
          usefulness: true,
          labels: true
        }
      })

      console.log(`GET /api/annotations - Found ${annotations.length} annotations`);
      
      // Convert array to object with textSummaryId as key for easier lookup
      const annotationsMap = annotations.reduce((acc, annotation) => {
        acc[annotation.textSummaryId] = {
          comprehensiveness: annotation.comprehensiveness,
          layness: annotation.layness, 
          factuality: annotation.factuality,
          usefulness: annotation.usefulness,
          labels: annotation.labels
        }
        return acc
      }, {} as Record<string, any>)

      console.log('GET /api/annotations - Converted to map with keys:', Object.keys(annotationsMap));
      
      return NextResponse.json({ annotations: annotationsMap })
    }
  } catch (error) {
    console.error("Error fetching annotation(s):", error)
    return NextResponse.json(
      { error: "Failed to fetch annotation(s)" },
      { status: 500 }
    )
  }
}