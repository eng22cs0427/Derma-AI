import { Pool, QueryResult } from 'pg'

const isProduction = process.env.NODE_ENV === 'production'
const useSSL = process.env.DB_SSL === 'true' || isProduction

// Singleton pool — prevents creating a new pool on every hot-reload in dev
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    // Reduced pool size for RDS free-tier (t3.micro allows ~80 max connections)
    max: 5,
    min: 0,
    // Shorten timeout to 5s so UI doesn't hang for 30s when DB drops
    connectionTimeoutMillis: 5000,
    // Drop idle connections quickly (2s) to prevent using stale/dead TCP sockets
    idleTimeoutMillis: 2000,
    // Automatically exit if idle
    allowExitOnIdle: true,
  })
}

// Reuse the pool across Next.js hot-reloads in development
const pool = global.__pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool
}

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error — will reconnect automatically:', err.message)
})

// Retry helper — retries once on connection timeout before giving up
async function queryWithRetry(text: string, params?: unknown[], attempt = 1): Promise<QueryResult> {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Query executed', { ms: Date.now() - start, rows: res.rowCount })
    }
    return res
  } catch (error: unknown) {
    const msg = (error as Error)?.message ?? ''
    const code = (error as any)?.code ?? ''
    const isTimeout = msg.toLowerCase().includes('timeout') || code === 'ETIMEDOUT' || msg.includes('Connection terminated')
    if (isTimeout && attempt < 3) {
      console.warn(`[DB] Connection timeout on attempt ${attempt} — retrying in ${attempt * 1000}ms…`)
      await new Promise((r) => setTimeout(r, attempt * 1000))
      return queryWithRetry(text, params, attempt + 1)
    }
    console.error(`[DB] Query error:`, code, msg)
    throw error
  }
}

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return queryWithRetry(text, params)
}

export async function getClient() {
  return await pool.connect()
}

export default pool
