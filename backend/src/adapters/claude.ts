import type { ChatMessage, ModelAdapter } from './base.js'

interface ClaudeConfig {
  apiKey: string
  modelName?: string
}

interface ClaudeContentBlock {
  type: string
  text?: string
}

interface ClaudeStreamEvent {
  type: string
  delta?: { type: string; text?: string }
  content?: ClaudeContentBlock[]
}

export class ClaudeAdapter implements ModelAdapter {
  private apiKey: string
  private modelName: string
  private baseURL = 'https://api.anthropic.com/v1'

  constructor(config: ClaudeConfig) {
    this.apiKey = config.apiKey
    this.modelName = config.modelName ?? 'claude-3-5-sonnet-20241022'
  }

  private buildRequest(messages: ChatMessage[], stream: boolean) {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')

    return {
      model: this.modelName,
      max_tokens: 4096,
      system: systemMessages.map((m) => m.content).join('\n') || undefined,
      messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
      stream,
    }
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(this.buildRequest(messages, false)),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Claude API error ${response.status}: ${text}`)
    }

    const data = (await response.json()) as { content: ClaudeContentBlock[] }
    const textBlock = data.content?.find((b) => b.type === 'text')
    return textBlock?.text ?? ''
  }

  async *stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(this.buildRequest(messages, true)),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Claude API error ${response.status}: ${text}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        try {
          const event = JSON.parse(data) as ClaudeStreamEvent
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const text = event.delta.text
            if (text) yield text
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  }
}
