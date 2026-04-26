import type { ChatMessage, ModelAdapter } from './base.js'

interface OpenAIConfig {
  apiKey: string
  baseURL?: string
  modelName?: string
}

interface SSEChunk {
  choices?: Array<{
    delta?: { content?: string }
    finish_reason?: string | null
  }>
}

export class OpenAIAdapter implements ModelAdapter {
  private apiKey: string
  private baseURL: string
  private modelName: string

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL ?? 'https://api.openai.com/v1'
    this.modelName = config.modelName ?? 'gpt-4o'
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        stream: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${text}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }

  async *stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${text}`)
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
        if (data === '[DONE]') return
        try {
          const chunk = JSON.parse(data) as SSEChunk
          const content = chunk.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  }
}
