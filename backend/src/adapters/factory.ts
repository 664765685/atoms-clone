import { getDb } from '../db/client.js'
import type { ModelAdapter } from './base.js'
import { MockAdapter } from './mock.js'
import { OpenAIAdapter } from './openai.js'
import { ClaudeAdapter } from './claude.js'
import { logger } from '../utils/logger.js'

interface AdapterConfig {
  provider: string
  modelName: string
  apiKey?: string
  baseURL?: string
}

/**
 * Create a model adapter from an explicit config object.
 * @param config - Adapter configuration
 * @returns ModelAdapter instance
 */
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

/**
 * Create a model adapter by reading configuration from the database settings.
 * Falls back to MockAdapter if no API key is configured or provider is 'mock'.
 * @returns Promise<ModelAdapter> instance
 */
export async function createAdapterFromDb(): Promise<ModelAdapter> {
  try {
    const db = getDb()
    const result = await db.execute(
      'SELECT modelProvider, modelName, modelApiKey, modelBaseUrl FROM Settings WHERE id = 1',
    )
    const row = result.rows[0] as unknown as
      | {
          modelProvider: string
          modelName: string
          modelApiKey: string
          modelBaseUrl: string
        }
      | undefined

    const provider = row?.modelProvider ?? 'mock'
    const modelName = row?.modelName ?? 'mock'
    const modelApiKey = row?.modelApiKey ?? ''
    const modelBaseUrl = row?.modelBaseUrl ?? ''

    // If no API key is set for non-mock providers, fall back to mock
    if (provider !== 'mock' && !modelApiKey) {
      logger.warn('No model API key configured, falling back to MockAdapter', { provider })
      return new MockAdapter()
    }

    logger.info('Creating adapter from DB settings', { provider, modelName })
    return createAdapter({
      provider,
      modelName,
      apiKey: modelApiKey,
      baseURL: modelBaseUrl || undefined,
    })
  } catch (err) {
    logger.error('Failed to create adapter from DB, falling back to MockAdapter', { err })
    return new MockAdapter()
  }
}
