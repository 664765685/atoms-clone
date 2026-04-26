/** Supported model providers */
export type ModelProvider = 'catpaw' | 'claude' | 'openai'

/** Agent roles in the pipeline */
export type AgentRole = 'pm' | 'architect' | 'engineer' | 'qa'

/** Task execution status */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

/** Technology stack for a task */
export type TechStack = {
  frontend?: string
  backend?: string
  [key: string]: string | undefined
}

/** Settings record */
export type Settings = {
  id: number
  modelProvider: string
  modelName: string
  apiKey: string
  githubToken: string
  githubUsername: string
}

/** Task record */
export type Task = {
  id: string
  title: string
  requirement: string
  techStack: string
  status: TaskStatus
  errorMsg: string | null
  githubRepo: string | null
  githubCommit: string | null
  createdAt: string
  finishedAt: string | null
}

/** Task with related logs */
export type TaskWithLogs = Task & {
  logs: AgentLog[]
}

/** Generated file record */
export type GeneratedFile = {
  id: string
  taskId: string
  path: string
  content: string
  language: string
}

/** Agent execution log record */
export type AgentLog = {
  id: string
  taskId: string
  agentRole: AgentRole
  content: string
  createdAt: string
}

/** Pipeline event types for WebSocket */
export type PipelineEvent =
  | { type: 'agent_start'; taskId: string; agent: AgentRole }
  | { type: 'agent_chunk'; taskId: string; agent: AgentRole; chunk: string }
  | { type: 'agent_done'; taskId: string; agent: AgentRole }
  | { type: 'file_created'; taskId: string; path: string }
  | { type: 'task_done'; taskId: string; fileCount: number }
  | { type: 'task_failed'; taskId: string; error: string }
