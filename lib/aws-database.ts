/**
 * AWS Database shim — re-exports from MongoDB layer
 * Preserves import path: import { query } from '@/lib/aws-database'
 * query() is no longer PostgreSQL-based — use getDb()/getCollection() for new code
 */
export { getDb, getCollection, ObjectId } from './mongodb'

// Legacy compat: query() stub that throws with a helpful message
// Any route still using raw query() will get a clear error during development
export async function query(_text: string, _params?: unknown[]): Promise<never> {
  throw new Error(
    '[DermaSense] query() is removed. Use getCollection() from @/lib/mongodb instead. ' +
    'Check the migration guide in AWS_MIGRATION_PLAN.md'
  )
}

export async function getClient(): Promise<never> {
  throw new Error('[DermaSense] getClient() is removed. Use getCollection() from @/lib/mongodb instead.')
}
