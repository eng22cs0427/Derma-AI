import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const API_URL = process.env.API_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  // Check if ML service is available in production
  const isProduction = process.env.NODE_ENV === 'production'
  const apiUrl = API_URL || ''
  const mlDisabled =
    apiUrl === "disabled" ||
    !apiUrl ||
    (apiUrl.includes('localhost') && isProduction) ||
    (apiUrl.includes('127.0.0.1') && isProduction)

  if (mlDisabled) {
    return NextResponse.json(
      {
        error: "ML prediction service is temporarily unavailable",
        message: "This feature requires the FastAPI backend service. Please contact support.",
        status: "disabled"
      },
      { status: 503 }
    )
  }

  try {
    // Correctly access cookies in a Route Handler
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")?.value

    const formData = await request.formData()

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: {
        // Include auth token if available
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    })

    const contentType = response.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")

    if (!response.ok) {
      if (isJson) {
        const errorData = await response.json()
        return NextResponse.json({ error: errorData.detail || errorData.error || "Failed to process image" }, { status: response.status })
      }

      const errorText = await response.text()
      return NextResponse.json(
        {
          error: "AI service returned a non-JSON response",
          details: errorText.slice(0, 200),
        },
        { status: response.status }
      )
    }

    if (!isJson) {
      const bodyText = await response.text()
      return NextResponse.json(
        {
          error: "AI service response format is invalid",
          details: bodyText.slice(0, 200),
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in predict API route:", error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        return NextResponse.json(
          { 
            error: "AI service is not available. Please ensure the FastAPI backend is running on port 8000.",
            details: "Run: cd api && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
          }, 
          { status: 503 }
        )
      }
      if (error.message.includes("fetch failed")) {
        return NextResponse.json(
          { 
            error: "Failed to connect to AI service",
            details: error.message 
          }, 
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
