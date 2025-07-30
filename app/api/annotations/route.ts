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
      
      // First, check if there's a completed UserGroup assignment
      const userGroupAssignment = await prisma.userGroup.findFirst({
        where: {
          userID: targetUserId,
          summaryID: textId,
          completed: true
        }
      })

      if (userGroupAssignment) {
        // Fetch the annotation directly from AnnotationGroup table
        const groupAnnotation = await prisma.annotationGroup.findFirst({
          where: {
            userID: targetUserId,
            summaryID: textId
          },
          select: {
            comprehensiveness: true,
            layness: true,
            factuality: true,
            created_at: true
          }
        })

        if (groupAnnotation) {
          console.log(`GET /api/annotations - Found completed group annotation for textId ${textId}:`, groupAnnotation);
          return NextResponse.json({ 
            annotation: {
              comprehensiveness: Number(groupAnnotation.comprehensiveness),
              layness: Number(groupAnnotation.layness),
              factuality: Number(groupAnnotation.factuality),
              usefulness: 0 // Group annotations don't have usefulness
            }
          })
        }
      }

      // Fall back to individual annotation
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
      
      // Try to fetch completed UserGroup assignments first
      try {
        console.log('GET /api/annotations - Attempting to fetch group annotations...');
        
        // First, let's check if there are any UserGroup records at all
        const allUserGroups = await prisma.userGroup.findMany({
          where: {
            userID: targetUserId
          },
          select: {
            summaryID: true,
            completed: true
          }
        })
        
        console.log(`GET /api/annotations - Found ${allUserGroups.length} total user group assignments`);
        console.log('All UserGroup records:', allUserGroups);
        
        const completedUserGroups = await prisma.userGroup.findMany({
          where: {
            userID: targetUserId,
            completed: true
          },
          select: {
            summaryID: true
          }
        })

        console.log(`GET /api/annotations - Found ${completedUserGroups.length} completed user group assignments`);
        console.log('Completed summary IDs:', completedUserGroups.map(ug => ug.summaryID));
        
        if (completedUserGroups.length > 0) {
          // Get all summary IDs that are completed
          const summaryIds = completedUserGroups.map(ug => ug.summaryID)
          
          // Fetch all annotations from AnnotationGroup table for these summaries
          const groupAnnotations = await prisma.annotationGroup.findMany({
            where: {
              userID: targetUserId,
              summaryID: {
                in: summaryIds
              }
            },
            select: {
              summaryID: true,
              comprehensiveness: true,
              layness: true,
              factuality: true,
              created_at: true
            }
          })

          console.log(`GET /api/annotations - Found ${groupAnnotations.length} group annotations`);
          console.log('Group annotation summary IDs:', groupAnnotations.map(ag => ag.summaryID));
          
          // Convert to summaryID-based map
          const annotationsMap = groupAnnotations.reduce((acc, annotation) => {
            acc[annotation.summaryID] = {
              comprehensiveness: Number(annotation.comprehensiveness),
              layness: Number(annotation.layness), 
              factuality: Number(annotation.factuality),
              usefulness: 0 // Group annotations don't have usefulness
            }
            return acc
          }, {} as Record<string, any>)

          console.log('GET /api/annotations - Converted group annotations to map with keys:', Object.keys(annotationsMap));
          return NextResponse.json({ annotations: annotationsMap })
        } else {
          console.log('GET /api/annotations - No completed user group assignments found');
        }
      } catch (groupError) {
        console.log('GET /api/annotations - Group annotations not available, falling back to individual annotations:', groupError);
      }
      
      // Fall back to individual annotations
      console.log('GET /api/annotations - Fetching individual annotations...');
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

      console.log(`GET /api/annotations - Found ${annotations.length} individual annotations`);
      
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