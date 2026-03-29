import { NextResponse } from 'next/server';
import { query } from '@/lib/aws-database';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: 'unknown',
      s3: 'unknown',
      mlApi: 'unknown',
    },
    config: {
      nodeEnv: process.env.NODE_ENV || 'development',
      databaseConfigured: !!process.env.DATABASE_URL,
      s3Configured: !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
      ),
      mlEnabled: process.env.ENABLE_ML_PREDICTIONS === 'true',
    },
  };

  // Check Database connectivity
  try {
    if (checks.config.databaseConfigured) {
      await query('SELECT 1');
      checks.services.database = 'ok';
    } else {
      checks.services.database = 'not_configured';
    }
  } catch (err) {
    checks.services.database = 'error';
    checks.status = 'degraded';
  }

  // Check S3 configuration
  checks.services.s3 = checks.config.s3Configured
    ? 'configured'
    : 'not_configured';

  // Check ML API
  const apiUrl = process.env.API_URL;
  if (!apiUrl || apiUrl === 'disabled') {
    checks.services.mlApi = 'disabled';
  } else {
    checks.services.mlApi = 'configured';
  }

  // Overall health
  const isHealthy =
    checks.services.database === 'ok' ||
    checks.services.database === 'configured';
  checks.status = isHealthy ? 'healthy' : 'unhealthy';

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
