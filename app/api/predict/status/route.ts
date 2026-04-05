import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, ISkinAnalysis } from '@/database/mongodb-schema'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profiles = await getCollection<IProfile>('profiles')
    const profile = await profiles.findOne({ clerkUserId: userId })

    if (!profile) {
      return NextResponse.json({ can_analyze: true, analyses_today: 0, next_allowed_time: null })
    }

    const analyses = await getCollection<ISkinAnalysis>('skin_analyses')
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const recentAnalyses = await analyses
      .find({ userId: profile._id!, createdAt: { $gte: since24h } })
      .sort({ createdAt: -1 })
      .project({ createdAt: 1 })
      .toArray()

    const analyses_today = recentAnalyses.length

    if (analyses_today === 0) {
      return NextResponse.json({ can_analyze: true, analyses_today: 0, next_allowed_time: null })
    }

    const latestAnalysisTime = new Date(recentAnalyses[0].createdAt)
    let delayMinutes = analyses_today === 1 ? 5 : analyses_today === 2 ? 10 : 20
    const nextAllowedTime = new Date(latestAnalysisTime.getTime() + delayMinutes * 60000)
    const now = new Date()

    return NextResponse.json({
      can_analyze: now >= nextAllowedTime,
      analyses_today,
      delay_tier_minutes: delayMinutes,
      last_analysis_time: latestAnalysisTime.toISOString(),
      next_allowed_time: nextAllowedTime.toISOString(),
      time_remaining_ms: Math.max(0, nextAllowedTime.getTime() - now.getTime()),
    })
  } catch (error) {
    console.error('[Status API Error]', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
