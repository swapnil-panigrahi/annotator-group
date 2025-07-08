import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { userId, summaryWindowDays } = await req.json()
  if (!userId || typeof summaryWindowDays !== 'number') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  // Upsert settings
  await prisma.settings.upsert({
    where: { userId },
    update: { summaryWindowDays },
    create: { userId, summaryWindowDays }
  })
  return NextResponse.json({ success: true })
}
