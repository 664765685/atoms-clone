import { getDb } from '../db/client.js'
import { emitToTask } from '../websocket/index.js'
import { logger } from '../utils/logger.js'
import { createAdapterFromDb } from '../adapters/factory.js'
import { TaskContext } from './context.js'
import { runPMAgent } from './pm-agent.js'
import { runArchitectAgent } from './architect-agent.js'
import { runEngineerAgent } from './engineer-agent.js'
import { runQAAgent } from './qa-agent.js'

/**
 * Run the full agent pipeline for a given task.
 * Emits WebSocket events at each stage and writes results to the database.
 * @param taskId - The task ID to run the pipeline for
 */
export async function runPipeline(taskId: string): Promise<void> {
  const db = getDb()

  try {
    // 1. Read task record from DB
    const taskResult = await db.execute({
      sql: 'SELECT id, requirement, techStack FROM Task WHERE id = ?',
      args: [taskId],
    })
    const taskRow = taskResult.rows[0]
    if (!taskRow) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const task = {
      id: String(taskRow['id']),
      requirement: String(taskRow['requirement']),
      techStack: String(taskRow['techStack']),
    }

    // 2. Create adapter from DB settings (handles provider selection and fallback)
    const adapter = await createAdapterFromDb()

    logger.info('Pipeline starting', { taskId })

    // Mark task as running
    await db.execute({
      sql: `UPDATE Task SET status = 'running' WHERE id = ?`,
      args: [taskId],
    })

    // 4. Create task context
    const ctx = new TaskContext(task)

    // 5. Run agents sequentially
    await runPMAgent(adapter, ctx)

    await db.execute({
      sql: 'INSERT INTO AgentLog (id, taskId, agentRole, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [
        crypto.randomUUID(),
        taskId,
        'pm',
        JSON.stringify({ features: ctx.features }),
        new Date().toISOString(),
      ],
    })

    await runArchitectAgent(adapter, ctx)

    await db.execute({
      sql: 'INSERT INTO AgentLog (id, taskId, agentRole, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [
        crypto.randomUUID(),
        taskId,
        'architect',
        JSON.stringify({ fileManifest: ctx.fileManifest }),
        new Date().toISOString(),
      ],
    })

    await runEngineerAgent(adapter, ctx)

    await db.execute({
      sql: 'INSERT INTO AgentLog (id, taskId, agentRole, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [
        crypto.randomUUID(),
        taskId,
        'engineer',
        JSON.stringify({ filesGenerated: ctx.generatedFiles.map((f) => f.path) }),
        new Date().toISOString(),
      ],
    })

    await runQAAgent(adapter, ctx)

    await db.execute({
      sql: 'INSERT INTO AgentLog (id, taskId, agentRole, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [
        crypto.randomUUID(),
        taskId,
        'qa',
        JSON.stringify({ qaIssues: ctx.qaIssues }),
        new Date().toISOString(),
      ],
    })

    // 6. Write all generated files to DB
    for (const file of ctx.generatedFiles) {
      await db.execute({
        sql: 'INSERT INTO GeneratedFile (id, taskId, path, content, language) VALUES (?, ?, ?, ?, ?)',
        args: [crypto.randomUUID(), taskId, file.path, file.content, file.language],
      })
    }

    // Update task status to done
    await db.execute({
      sql: `UPDATE Task SET status = 'done', finishedAt = ? WHERE id = ?`,
      args: [new Date().toISOString(), taskId],
    })

    emitToTask({ type: 'task_done', taskId, fileCount: ctx.generatedFiles.length })
    logger.info('Pipeline completed', { taskId, fileCount: ctx.generatedFiles.length })
  } catch (err) {
    logger.error('Pipeline error', { taskId, err })

    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    try {
      await db.execute({
        sql: `UPDATE Task SET status = 'failed', errorMsg = ? WHERE id = ?`,
        args: [errorMsg, taskId],
      })
    } catch (dbErr) {
      logger.error('Failed to update task status to failed', { taskId, dbErr })
    }

    emitToTask({ type: 'task_failed', taskId, error: errorMsg })
  }
}
