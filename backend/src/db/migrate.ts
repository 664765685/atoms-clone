import { getDb } from './client.js'
import { logger } from '../utils/logger.js'

/**
 * Run database migrations to initialize all tables.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
export async function runMigrations(): Promise<void> {
  const db = getDb()

  await db.batch([
    `CREATE TABLE IF NOT EXISTS Settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      modelProvider TEXT NOT NULL DEFAULT 'catpaw',
      modelName TEXT NOT NULL DEFAULT 'catclaw-proxy-model',
      apiKey TEXT NOT NULL DEFAULT '',
      githubToken TEXT NOT NULL DEFAULT '',
      githubUsername TEXT NOT NULL DEFAULT ''
    )`,
    `INSERT OR IGNORE INTO Settings (id) VALUES (1)`,
    `CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      requirement TEXT NOT NULL,
      techStack TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      errorMsg TEXT,
      githubRepo TEXT,
      githubCommit TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      finishedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS GeneratedFile (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES Task(id)
    )`,
    `CREATE TABLE IF NOT EXISTS AgentLog (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      agentRole TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (taskId) REFERENCES Task(id)
    )`,
  ], 'write')

  // Migration: add githubUsername column to existing databases that pre-date this column.
  // ALTER TABLE ADD COLUMN fails if the column already exists, so we ignore that error.
  try {
    await db.execute(`ALTER TABLE Settings ADD COLUMN githubUsername TEXT NOT NULL DEFAULT ''`)
    logger.info('Migration: added githubUsername column to Settings')
  } catch {
    // Column already exists — safe to ignore
  }

  logger.info('Database migrations completed')
}
