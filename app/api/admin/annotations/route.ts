import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ annotations: [] })
  const annotations = await prisma.annotation.findMany({
    where: { userId },
    select: {
      id: true,
      textSummaryId: true,
      comprehensiveness: true,
      layness: true,
      factuality: true,
      usefulness: true,
      labels: true
    }
  })
  return NextResponse.json({ annotations })
}
