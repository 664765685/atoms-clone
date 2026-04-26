import type { ModelAdapter } from './base.js'
import { MockAdapter } from './mock.js'
import { OpenAIAdapter } from './openai.js'
import { ClaudeAdapter } from './claude.js'

interface AdapterConfig {
  provider: string
  modelName: string
  apiKey?: string
  baseURL?: string
}

export function createAdapter(config: AdapterConfig): ModelAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter({
        apiKey: config.apiKey ?? '',
        baseURL: config.baseURL,
        modelName: config.modelName,
      })
    case 'claude':
      return new ClaudeAdapter({
        apiKey: config.apiKey ?? '',
        modelName: config.modelName,
      })
    case 'mock':
      return new MockAdapter()
    default:
      return new MockAdapter()
  }
}
