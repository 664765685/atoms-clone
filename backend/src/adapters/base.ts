export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ModelAdapter {
  stream(messages: ChatMessage[]): AsyncGenerator<string>
  complete(messages: ChatMessage[]): Promise<string>
}
