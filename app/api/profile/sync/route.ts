import { NextResponse } from "next/server"
import { ensureUserProfileExists } from "@/lib/profile-sync"

export async function POST(req: Request) {
  try {
    const { userId, email, fullName } = await req.json()
    
    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const profile = await ensureUserProfileExists(userId, email, fullName)
    
    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Profile sync API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
