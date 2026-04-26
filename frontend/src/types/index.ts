/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

/** Agent 角色 */
export type AgentRole = 'pm' | 'architect' | 'engineer' | 'qa'

/** 任务 */
export type Task = {
  id: string
  title: string
  requirement: string
  techStack: { frontend: string; backend: string }
  status: TaskStatus
  errorMsg?: string
  githubRepo?: string
  githubCommit?: string
  createdAt: string
  finishedAt?: string
}

/** 生成的文件 */
export type GeneratedFile = {
  id: string
  taskId: string
  path: string
  content: string
  language: string
}

/** Agent 执行日志 */
export type AgentLog = {
  id: string
  taskId: string
  agentRole: AgentRole
  content: string
  createdAt: string
}

/** 应用设置 */
export type Settings = {
  modelProvider: 'catpaw' | 'claude' | 'openai'
  modelName: string
  hasApiKey: boolean
  hasGithubToken: boolean
}

/** Pipeline 事件类型 */
export type PipelineEvent =
  | { type: 'agent_start'; agent: AgentRole }
  | { type: 'agent_chunk'; agent: AgentRole; chunk: string }
  | { type: 'agent_done'; agent: AgentRole }
  | { type: 'file_created'; path: string }
  | { type: 'task_done'; fileCount: number }
  | { type: 'task_failed'; error: string }
