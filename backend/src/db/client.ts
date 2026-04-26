import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

/**
 * Get the singleton libSQL database client.
 * Uses DATABASE_URL from env (e.g. "file:./dev.db").
 * @returns {Client} The singleton database client
 */
export function getDb(): Client {
  if (!_client) {
    const url = process.env['DATABASE_URL'] ?? 'file:./dev.db'
    _client = createClient({ url })
  }
  return _client
}

export default getDb
