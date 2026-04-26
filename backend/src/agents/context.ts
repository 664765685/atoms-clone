export interface FileManifestEntry {
  path: string
  purpose: string
}

export interface GeneratedFileEntry {
  path: string
  language: string
  content: string
}

export interface QAIssue {
  severity: string
  file: string
  description: string
}

export class TaskContext {
  taskId: string
  requirement: string
  techStack: { frontend: string; backend: string }

  // Agent outputs
  features: unknown[]
  fileManifest: FileManifestEntry[]
  generatedFiles: GeneratedFileEntry[]
  qaIssues: QAIssue[]

  constructor(task: { id: string; requirement: string; techStack: string }) {
    this.taskId = task.id
    this.requirement = task.requirement
    this.techStack = JSON.parse(task.techStack) as { frontend: string; backend: string }
    this.features = []
    this.fileManifest = []
    this.generatedFiles = []
    this.qaIssues = []
  }
}
