/**
 * External types and type helpers for third-party APIs and internal utilities
 * This file centralizes type definitions to reduce 'as any' casts throughout the codebase
 */

/**
 * Well-known OpenCode configuration from /.well-known/opencode endpoint
 */
export interface WellKnownOpenCodeConfig {
  config?: Record<string, unknown>
  auth?: {
    command: string[]
    env?: string | Record<string, string>
  }
  [key: string]: unknown
}

/**
 * Node.js process internals (non-public API)
 * Used for debugging active handles and requests
 */
export interface NodeProcessInternals {
  _getActiveHandles(): unknown[]
  _getActiveRequests(): unknown[]
}

/**
 * Provider-specific metadata structures
 */
export namespace ProviderMetadata {
  export interface BedrockUsage {
    cacheWriteInputTokens?: number
    cacheReadInputTokens?: number
    inputTokens?: number
    outputTokens?: number
  }

  export interface BedrockMetadata {
    usage?: BedrockUsage
    [key: string]: unknown
  }

  export interface Metadata {
    bedrock?: BedrockMetadata
    [provider: string]: unknown
  }
}

/**
 * GitHub Release API response
 */
export interface GitHubRelease {
  tag_name: string
  name: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
  [key: string]: unknown
}

/**
 * Defer promise helper return type
 */
export interface DeferredPromise<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

/**
 * Type helper for Zod schema with _def property
 */
export interface ZodSchemaWithDef {
  _def?: unknown
  [key: string]: unknown
}

/**
 * Generic JSON response from fetch
 */
export type JsonResponse = Record<string, unknown>
