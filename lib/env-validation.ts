/**
 * Environment Variable Validation
 * Validates required environment variables at build time
 * Prevents deployment with missing critical configuration
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const optionalEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'API_URL',
] as const

export function validateEnvironment() {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check optional but important variables
  for (const key of optionalEnvVars) {
    if (!process.env[key] || process.env[key] === 'YOUR_AWS_ACCESS_KEY_HERE') {
      warnings.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n${missing.join('\n')}\n\n` +
      `Please set these in your Vercel Dashboard → Settings → Environment Variables\n` +
      `See .env.production.example for details`
    )
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(
      `⚠️  Warning: Some optional services may not work:\n${warnings.join('\n')}`
    )
  }

  return true
}

// Run validation at module load time (except in tests)
if (process.env.NODE_ENV !== 'test') {
  validateEnvironment()
}
