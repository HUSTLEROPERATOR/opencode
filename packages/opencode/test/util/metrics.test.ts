import { test, expect, beforeEach, describe } from "bun:test"
import { Metrics } from "../../src/util/metrics"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import path from "path"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("Metrics system", () => {
  test("counter increments count", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.counter")
        Metrics.counter("test.counter")
        Metrics.counter("test.counter")

        const data = Metrics.get("test.counter")
        expect(data?.count).toBe(3)
      },
    })
  })

  test("counter tracks total, min, and max values", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.values", 10)
        Metrics.counter("test.values", 5)
        Metrics.counter("test.values", 20)

        const data = Metrics.get("test.values")
        expect(data?.count).toBe(3)
        expect(data?.total).toBe(35)
        expect(data?.min).toBe(5)
        expect(data?.max).toBe(20)
      },
    })
  })

  test("summary calculates average correctly", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.avg", 10)
        Metrics.counter("test.avg", 20)
        Metrics.counter("test.avg", 30)

        const summary = Metrics.summary("test.avg")
        expect(summary?.count).toBe(3)
        expect(summary?.total).toBe(60)
        expect(summary?.average).toBe(20)
        expect(summary?.min).toBe(10)
        expect(summary?.max).toBe(30)
      },
    })
  })

  test("timer measures duration", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        const timer = Metrics.timer("test.timer")

        // Simulate some work
        const start = Date.now()
        while (Date.now() - start < 10) {
          // Wait at least 10ms
        }

        const duration = timer.stop()

        expect(duration).toBeGreaterThanOrEqual(10)

        const durationMetric = Metrics.get("test.timer.duration")
        expect(durationMetric).toBeDefined()
        expect(durationMetric?.count).toBe(1)
        expect(durationMetric?.total).toBeGreaterThanOrEqual(10)
      },
    })
  })

  test("timer with using syntax", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        {
          using timer = Metrics.timer("test.using")

          // Simulate some work
          const start = Date.now()
          while (Date.now() - start < 10) {
            // Wait at least 10ms
          }
        }

        const durationMetric = Metrics.get("test.using.duration")
        expect(durationMetric).toBeDefined()
        expect(durationMetric?.count).toBe(1)
        expect(durationMetric?.total).toBeGreaterThanOrEqual(10)
      },
    })
  })

  test("toolCall tracks success and failure", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.toolCall("read", true, 100)
        Metrics.toolCall("read", true, 150)
        Metrics.toolCall("read", false, 50)

        expect(Metrics.get("tool.calls.total")?.count).toBe(3)
        expect(Metrics.get("tool.calls.read")?.count).toBe(3)
        expect(Metrics.get("tool.calls.success")?.count).toBe(2)
        expect(Metrics.get("tool.calls.failure")?.count).toBe(1)
        expect(Metrics.get("tool.calls.read.success")?.count).toBe(2)
        expect(Metrics.get("tool.calls.read.failure")?.count).toBe(1)

        const readDuration = Metrics.get("tool.read.duration")
        expect(readDuration?.count).toBe(3)
        expect(readDuration?.total).toBe(300)
      },
    })
  })

  test("retry tracks attempts and exhaustion", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.retry("session.prompt", 1, 5)
        Metrics.retry("session.prompt", 2, 5)
        Metrics.retry("session.prompt", 5, 5)

        expect(Metrics.get("retries.total")?.count).toBe(3)
        expect(Metrics.get("retries.session.prompt")?.count).toBe(3)
        expect(Metrics.get("retries.exhausted")?.count).toBe(1)
        expect(Metrics.get("retries.session.prompt.exhausted")?.count).toBe(1)
      },
    })
  })

  test("patchSize tracks bytes and lines", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.patchSize(1024, 50)
        Metrics.patchSize(2048, 100)

        expect(Metrics.get("patch.total")?.count).toBe(2)
        expect(Metrics.get("patch.bytes")?.total).toBe(3072)
        expect(Metrics.get("patch.lines")?.total).toBe(150)

        const bytesAvg = Metrics.summary("patch.bytes")
        expect(bytesAvg?.average).toBe(1536)
      },
    })
  })

  test("tokens tracks different token types", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.tokens("input", 100)
        Metrics.tokens("output", 50)
        Metrics.tokens("reasoning", 200)
        Metrics.tokens("cache", 300)

        expect(Metrics.get("tokens.total")?.total).toBe(650)
        expect(Metrics.get("tokens.input")?.total).toBe(100)
        expect(Metrics.get("tokens.output")?.total).toBe(50)
        expect(Metrics.get("tokens.reasoning")?.total).toBe(200)
        expect(Metrics.get("tokens.cache")?.total).toBe(300)
      },
    })
  })

  test("reset clears specific counter", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.reset", 10)
        Metrics.counter("test.keep", 20)

        expect(Metrics.get("test.reset")).toBeDefined()
        expect(Metrics.get("test.keep")).toBeDefined()

        Metrics.reset("test.reset")

        expect(Metrics.get("test.reset")).toBeUndefined()
        expect(Metrics.get("test.keep")).toBeDefined()
      },
    })
  })

  test("resetAll clears all counters", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.counter1")
        Metrics.counter("test.counter2")
        Metrics.counter("test.counter3")

        expect(Object.keys(Metrics.getAll()).length).toBeGreaterThan(0)

        Metrics.resetAll()

        expect(Object.keys(Metrics.getAll()).length).toBe(0)
      },
    })
  })

  test("getAll returns all counters", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Metrics.resetAll()

        Metrics.counter("test.a", 10)
        Metrics.counter("test.b", 20)
        Metrics.counter("test.c", 30)

        const all = Metrics.getAll()

        expect(Object.keys(all).length).toBe(3)
        expect(all["test.a"]?.total).toBe(10)
        expect(all["test.b"]?.total).toBe(20)
        expect(all["test.c"]?.total).toBe(30)
      },
    })
  })
})
