import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from "@/lib/prisma";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// GET /api/ranking - Get ranking tasks assigned to the current user
export async function GET(req: NextRequest) {
  try {
    // Set up Supabase client for authentication
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get ranking tasks assigned to this user
    const userRankingTasks = await prisma.userRankingTask.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        rankingGroup: {
          include: {
            target: true,
            baseline: true,
            agenetic: true,
          },
        },
        ranking: true, // Include existing rankings
      },
      orderBy: [
        { rankingGroup: { abstract: 'asc' } }, // Then sort alphabetically by abstract text
      ],
    });

    // Transform the data to include rankings in the expected format for the frontend
    const transformedTasks = userRankingTasks.map(task => {
      if (task.ranking) {
        return {
          ...task,
          ranking: {
            targetRank: task.ranking.targetRank,
            baselineRank: task.ranking.baselineRank,
            ageneticRank: task.ranking.ageneticRank
          }
        };
      }
      return task;
    });

    return NextResponse.json({ userRankingTasks: transformedTasks }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching ranking tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking tasks" },
      { status: 500 }
    );
  }
}

// POST /api/ranking - Submit rankings for a ranking task
export async function POST(req: NextRequest) {
  try {
    // Set up Supabase client for authentication
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { taskId, targetRank, baselineRank, ageneticRank, markCompleted = false } = await req.json();

    if (!taskId || targetRank === undefined || baselineRank === undefined || ageneticRank === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that the ranks are valid (1, 2, 3 with no duplicates)
    const ranks = [targetRank, baselineRank, ageneticRank];
    const validRanks = [1, 2, 3];
    
    // Check if all ranks are valid numbers (1, 2, 3)
    if (!ranks.every(rank => validRanks.includes(rank))) {
      return NextResponse.json(
        { error: "Ranks must be 1, 2, or 3" },
        { status: 400 }
      );
    }
    
    // Check for duplicate ranks
    if (new Set(ranks).size !== ranks.length) {
      return NextResponse.json(
        { error: "Each summary must have a unique rank" },
        { status: 400 }
      );
    }

    // Get the ranking task
    const task = await prisma.userRankingTask.findUnique({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Ranking task not found" },
        { status: 404 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create or update the ranking
      const ranking = await tx.summaryRanking.upsert({
        where: {
          userRankingTaskId: taskId,
        },
        update: {
          targetRank,
          baselineRank,
          ageneticRank,
          updatedAt: new Date(),
        },
        create: {
          userRankingTaskId: taskId,
          targetRank,
          baselineRank,
          ageneticRank,
        },
      });
  
      // Mark the task as completed if requested and not already completed
      if (markCompleted) {
        await tx.userRankingTask.update({
          where: {
            id: taskId,
          },
          data: {
            completed: true,
          },
        });
      }
      
      return { ranking, completed: markCompleted || task.completed };
    });

    return NextResponse.json({ 
      success: true, 
      ranking: result.ranking,
      completed: result.completed
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error submitting ranking:", error);
    return NextResponse.json(
      { error: "Failed to submit ranking" },
      { status: 500 }
    );
  }
}