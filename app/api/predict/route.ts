import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000"

// ─── Main POST handler ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const apiUrl = API_URL || ''
  const mlDisabled =
    apiUrl === "disabled" ||
    !apiUrl ||
    (apiUrl.includes('localhost')  && isProduction) ||
    (apiUrl.includes('127.0.0.1') && isProduction)

  if (mlDisabled) {
    return NextResponse.json(
      { error: "ML prediction service is temporarily unavailable", status: "disabled" },
      { status: 503 }
    )
  }

  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")?.value

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // ── 1. Forward to FastAPI ML backend ──────────────────────────────────────
    const mlResponse = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { ...(authToken && { Authorization: `Bearer ${authToken}` }) },
      body: formData,
    })

    const contentType = mlResponse.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")

    if (!mlResponse.ok) {
      if (isJson) {
         const errData = await mlResponse.json()
         return NextResponse.json(
           { error: errData.detail || errData.error || "Failed to process image" },
           { status: mlResponse.status }
         )
      }
      return NextResponse.json({ error: "AI service returned a non-JSON response" }, { status: mlResponse.status })
    }

    if (!isJson) {
      return NextResponse.json({ error: "AI service response format is invalid" }, { status: 502 })
    }

    const data = await mlResponse.json()

    // ✨ Modification: We ONLY return the raw ML prediction result instantly.
    // The AWS persistence (S3 + RDS database) is now handled by a separate endpoint
    // to strictly prevent the prediction UI from blocking if AWS times out.
    return NextResponse.json(data)

  } catch (error) {
    console.error("[predict] Route error:", error)

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        return NextResponse.json(
          {
            error: "AI service is not running. Please start the FastAPI backend.",
            details: "Run in the api/ folder: uvicorn main:app --reload --host 127.0.0.1 --port 8000"
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}
