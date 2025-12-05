import { Log } from "./log"
import { Instance } from "../project/instance"

/**
 * Metrics system for tracking performance counters and measurements
 * Provides lightweight counters for tool calls, retries, patch sizes, and timing
 */
export namespace Metrics {
  const log = Log.create({ service: "metrics" })

  interface CounterData {
    count: number
    total: number
    min: number
    max: number
    lastValue?: number
    lastTimestamp?: number
  }

  const state = Instance.state(() => {
    const counters = new Map<string, CounterData>()
    const timings = new Map<string, number>()

    return {
      counters,
      timings,
    }
  })

  /**
   * Increment a counter with an optional value (for tracking totals/averages)
   */
  export function counter(name: string, value: number = 1): void {
    const { counters } = state()
    const existing = counters.get(name)

    if (existing) {
      existing.count++
      existing.total += value
      existing.min = Math.min(existing.min, value)
      existing.max = Math.max(existing.max, value)
      existing.lastValue = value
      existing.lastTimestamp = Date.now()
    } else {
      counters.set(name, {
        count: 1,
        total: value,
        min: value,
        max: value,
        lastValue: value,
        lastTimestamp: Date.now(),
      })
    }

    log.debug("counter", { name, value })
  }

  /**
   * Start a timer for measuring operation duration
   * Returns a function to stop the timer and record the duration
   */
  export function timer(name: string): { stop: () => number; [Symbol.dispose]: () => number } {
    const start = Date.now()
    const { timings } = state()
    timings.set(name, start)

    const stop = () => {
      const duration = Date.now() - start
      timings.delete(name)
      counter(`${name}.duration`, duration)
      log.debug("timer", { name, duration })
      return duration
    }

    return {
      stop,
      [Symbol.dispose]: stop,
    }
  }

  /**
   * Get current value of a counter
   */
  export function get(name: string): CounterData | undefined {
    const { counters } = state()
    return counters.get(name)
  }

  /**
   * Get all counters
   */
  export function getAll(): Record<string, CounterData> {
    const { counters } = state()
    return Object.fromEntries(counters.entries())
  }

  /**
   * Get summary statistics for a counter
   */
  export function summary(name: string): {
    count: number
    total: number
    average: number
    min: number
    max: number
  } | null {
    const data = get(name)
    if (!data) return null

    return {
      count: data.count,
      total: data.total,
      average: data.count > 0 ? data.total / data.count : 0,
      min: data.min,
      max: data.max,
    }
  }

  /**
   * Reset a specific counter
   */
  export function reset(name: string): void {
    const { counters } = state()
    counters.delete(name)
    log.debug("reset counter", { name })
  }

  /**
   * Reset all counters
   */
  export function resetAll(): void {
    const { counters, timings } = state()
    counters.clear()
    timings.clear()
    log.debug("reset all metrics")
  }

  /**
   * Log current metrics summary
   */
  export function report(): void {
    const all = getAll()
    const summaries: Record<string, any> = {}

    for (const [name, data] of Object.entries(all)) {
      summaries[name] = {
        count: data.count,
        avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
        min: data.min,
        max: data.max,
      }
    }

    log.info("metrics report", summaries)
  }

  /**
   * Track tool call execution
   */
  export function toolCall(toolName: string, success: boolean, durationMs?: number): void {
    counter("tool.calls.total")
    counter(`tool.calls.${toolName}`)

    if (success) {
      counter("tool.calls.success")
      counter(`tool.calls.${toolName}.success`)
    } else {
      counter("tool.calls.failure")
      counter(`tool.calls.${toolName}.failure`)
    }

    if (durationMs !== undefined) {
      counter("tool.duration", durationMs)
      counter(`tool.${toolName}.duration`, durationMs)
    }
  }

  /**
   * Track retry attempts
   */
  export function retry(context: string, attempt: number, maxRetries: number): void {
    counter("retries.total")
    counter(`retries.${context}`)
    counter("retries.attempt", attempt)

    if (attempt >= maxRetries) {
      counter("retries.exhausted")
      counter(`retries.${context}.exhausted`)
    }
  }

  /**
   * Track patch/diff size
   */
  export function patchSize(sizeBytes: number, lineCount?: number): void {
    counter("patch.total")
    counter("patch.bytes", sizeBytes)

    if (lineCount !== undefined) {
      counter("patch.lines", lineCount)
    }
  }

  /**
   * Track token usage
   */
  export function tokens(type: "input" | "output" | "reasoning" | "cache", count: number): void {
    counter("tokens.total", count)
    counter(`tokens.${type}`, count)
  }
}
