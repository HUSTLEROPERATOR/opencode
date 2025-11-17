import { describe, expect, test } from "bun:test"
import { Bus } from "../../src/bus"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import z from "zod"
import path from "path"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("Bus event system", () => {
  test("should register and publish events", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const TestEvent = Bus.event("test.basic", z.object({ message: z.string() }))
        let received = false
        let receivedMessage = ""

        const unsub = Bus.subscribe(TestEvent, (event) => {
          received = true
          receivedMessage = event.properties.message
        })

        await Bus.publish(TestEvent, { message: "hello" })
        await new Promise((resolve) => setTimeout(resolve, 10))

        unsub()

        expect(received).toBe(true)
        expect(receivedMessage).toBe("hello")
      },
    })
  })

  test("should support multiple subscribers to same event", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const TestEvent = Bus.event("test.multiple", z.object({ value: z.number() }))
        const received: number[] = []

        const unsub1 = Bus.subscribe(TestEvent, (event) => {
          received.push(event.properties.value * 2)
        })

        const unsub2 = Bus.subscribe(TestEvent, (event) => {
          received.push(event.properties.value * 3)
        })

        await Bus.publish(TestEvent, { value: 5 })
        await new Promise((resolve) => setTimeout(resolve, 10))

        unsub1()
        unsub2()

        expect(received).toContain(10) // 5 * 2
        expect(received).toContain(15) // 5 * 3
        expect(received.length).toBe(2)
      },
    })
  })

  test("should support subscribeAll for wildcard subscription", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const Event1 = Bus.event("test.wildcard1", z.object({ id: z.string() }))
        const Event2 = Bus.event("test.wildcard2", z.object({ id: z.string() }))
        const receivedTypes: string[] = []

        const unsub = Bus.subscribeAll((event) => {
          receivedTypes.push(event.type)
        })

        await Bus.publish(Event1, { id: "a" })
        await Bus.publish(Event2, { id: "b" })
        await new Promise((resolve) => setTimeout(resolve, 10))

        unsub()

        expect(receivedTypes).toContain("test.wildcard1")
        expect(receivedTypes).toContain("test.wildcard2")
      },
    })
  })

  test("should unsubscribe correctly", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const TestEvent = Bus.event("test.unsub", z.object({ count: z.number() }))
        let callCount = 0

        const unsub = Bus.subscribe(TestEvent, () => {
          callCount++
        })

        await Bus.publish(TestEvent, { count: 1 })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(1)

        unsub()

        await Bus.publish(TestEvent, { count: 2 })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(1) // Should still be 1, not incremented
      },
    })
  })

  test("should support once() for one-time subscription", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const TestEvent = Bus.event("test.once", z.object({ done: z.boolean() }))
        let callCount = 0

        Bus.once(TestEvent, (event) => {
          callCount++
          return event.properties.done ? "done" : undefined
        })

        await Bus.publish(TestEvent, { done: false })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(1)

        await Bus.publish(TestEvent, { done: false })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(2)

        await Bus.publish(TestEvent, { done: true })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(3)

        // After returning "done", should not be called again
        await Bus.publish(TestEvent, { done: false })
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(callCount).toBe(3)
      },
    })
  })

  test("should handle events with complex properties", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const ComplexEvent = Bus.event(
          "test.complex",
          z.object({
            user: z.object({
              id: z.string(),
              name: z.string(),
            }),
            tags: z.array(z.string()),
            metadata: z.record(z.string(), z.any()),
          }),
        )

        let receivedData: any

        const unsub = Bus.subscribe(ComplexEvent, (event) => {
          receivedData = event.properties
        })

        const testData = {
          user: { id: "123", name: "Test User" },
          tags: ["tag1", "tag2"],
          metadata: { key: "value", nested: { data: 42 } },
        }

        await Bus.publish(ComplexEvent, testData)
        await new Promise((resolve) => setTimeout(resolve, 10))

        unsub()

        expect(receivedData).toBeDefined()
        expect(receivedData.user.id).toBe("123")
        expect(receivedData.tags).toEqual(["tag1", "tag2"])
        expect(receivedData.metadata.key).toBe("value")
      },
    })
  })

  test("should create discriminated union schema with payloads()", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        Bus.event("test.schema1", z.object({ field1: z.string() }))
        Bus.event("test.schema2", z.object({ field2: z.number() }))

        const schema = Bus.payloads()

        expect(schema).toBeDefined()
        // Verify it can parse valid events
        const result = schema.safeParse({
          type: "test.schema1",
          properties: { field1: "test" },
        })
        expect(result.success).toBe(true)
      },
    })
  })

  test("should handle async subscribers", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const AsyncEvent = Bus.event("test.async", z.object({ delay: z.number() }))
        const results: string[] = []

        const unsub = Bus.subscribe(AsyncEvent, async (event) => {
          await new Promise((resolve) => setTimeout(resolve, event.properties.delay))
          results.push("completed")
        })

        await Bus.publish(AsyncEvent, { delay: 20 })

        unsub()

        expect(results).toContain("completed")
      },
    })
  })

  test("should deliver events to both specific and wildcard subscribers", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const SpecificEvent = Bus.event("test.specific", z.object({ data: z.string() }))
        const specificReceived: string[] = []
        const wildcardReceived: string[] = []

        const unsubSpecific = Bus.subscribe(SpecificEvent, (event) => {
          specificReceived.push(event.properties.data)
        })

        const unsubWildcard = Bus.subscribeAll((event) => {
          if (event.type === "test.specific") {
            wildcardReceived.push(event.properties.data)
          }
        })

        await Bus.publish(SpecificEvent, { data: "test123" })
        await new Promise((resolve) => setTimeout(resolve, 10))

        unsubSpecific()
        unsubWildcard()

        expect(specificReceived).toEqual(["test123"])
        expect(wildcardReceived).toEqual(["test123"])
      },
    })
  })
})
