import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      supabase: 'unknown',
      s3: 'unknown',
      mlApi: 'unknown',
    },
    config: {
      nodeEnv: process.env.NODE_ENV || 'development',
      supabaseConfigured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      s3Configured: !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
      ),
      mlEnabled: process.env.ENABLE_ML_PREDICTIONS === 'true',
    },
  }

  // Check Supabase connectivity
  try {
    if (checks.config.supabaseConfigured) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase.auth.getSession()
      checks.services.supabase = error ? 'error' : 'ok'
    } else {
      checks.services.supabase = 'not_configured'
    }
  } catch (err) {
    checks.services.supabase = 'error'
    checks.status = 'degraded'
  }

  // Check S3 configuration
  checks.services.s3 = checks.config.s3Configured
    ? 'configured'
    : 'not_configured'

  // Check ML API
  const apiUrl = process.env.API_URL
  if (!apiUrl || apiUrl === 'disabled') {
    checks.services.mlApi = 'disabled'
  } else {
    checks.services.mlApi = 'configured'
  }

  // Overall health
  const isHealthy =
    checks.services.supabase === 'ok' ||
    checks.services.supabase === 'configured'
  checks.status = isHealthy ? 'healthy' : 'unhealthy'

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
