import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { query } from "@/lib/aws-database"

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch user profile to get dbProfileId
    const profileRes = await query(
      `SELECT id FROM profiles WHERE cognito_user_id = $1 LIMIT 1`,
      [userId]
    )
    
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ 
        can_analyze: true, 
        analyses_today: 0,
        next_allowed_time: null
      })
    }

    const dbProfileId = profileRes.rows[0].id

    // 2. Fetch the user's analyses from the last 24 hours to determine the tier
    // We only care about today's count to decide the break duration (5, 10, or 20 mins)
    // AND we need the absolute latest analysis to check the exact timestamp.
    const analysesRes = await query(
      `SELECT created_at FROM skin_analyses 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 HOURS'
       ORDER BY created_at DESC`,
      [dbProfileId]
    )

    const analyses_today = analysesRes.rows.length

    if (analyses_today === 0) {
      // First analysis of the day
      return NextResponse.json({ 
        can_analyze: true, 
        analyses_today: 0, 
        next_allowed_time: null 
      })
    }

    const latestAnalysisTime = new Date(analysesRes.rows[0].created_at)
    
    // Determine the required delay based on how many they've done today
    let delayMinutes = 0
    if (analyses_today === 1) {
      delayMinutes = 5
    } else if (analyses_today === 2) {
      delayMinutes = 10
    } else {
      delayMinutes = 20
    }

    // Calculate when they are allowed to analyze next
    const nextAllowedTime = new Date(latestAnalysisTime.getTime() + delayMinutes * 60000)
    const now = new Date()

    const can_analyze = now >= nextAllowedTime

    return NextResponse.json({
      can_analyze,
      analyses_today,
      delay_tier_minutes: delayMinutes,
      last_analysis_time: latestAnalysisTime.toISOString(),
      next_allowed_time: nextAllowedTime.toISOString(),
      time_remaining_ms: Math.max(0, nextAllowedTime.getTime() - now.getTime())
    })

  } catch (error) {
    console.error("[Status API Error]", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
