import { describe, expect, test } from "bun:test"
import { SessionCompaction } from "../../src/session/compaction"
import { Session } from "../../src/session"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { Identifier } from "../../src/id/id"
import path from "path"
import type { MessageV2 } from "../../src/session/message-v2"
import type { ModelsDev } from "../../src/provider/models"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("SessionCompaction.isOverflow", () => {
  test("should return false when context limit is 0", () => {
    const result = SessionCompaction.isOverflow({
      tokens: {
        input: 10000,
        output: 5000,
        reasoning: 0,
        cache: { read: 1000, write: 0 },
      },
      model: {
        limit: {
          context: 0,
          output: 4096,
        },
      } as ModelsDev.Model,
    })

    expect(result).toBe(false)
  })

  test("should return false when under context limit", () => {
    const result = SessionCompaction.isOverflow({
      tokens: {
        input: 10000,
        output: 5000,
        reasoning: 0,
        cache: { read: 1000, write: 0 },
      },
      model: {
        limit: {
          context: 200000,
          output: 4096,
        },
      } as ModelsDev.Model,
    })

    expect(result).toBe(false)
  })

  test("should return true when over context limit", () => {
    const result = SessionCompaction.isOverflow({
      tokens: {
        input: 50000,
        output: 30000,
        reasoning: 0,
        cache: { read: 20000, write: 0 },
      },
      model: {
        limit: {
          context: 100000, // Total tokens (50k+30k+20k) = 100k, but usable is less after output reservation
          output: 4096,
        },
      } as ModelsDev.Model,
    })

    expect(result).toBe(true)
  })

  test("should account for output token reservation", () => {
    const result = SessionCompaction.isOverflow({
      tokens: {
        input: 30000,
        output: 5000,
        reasoning: 0,
        cache: { read: 5000, write: 0 },
      },
      model: {
        limit: {
          context: 50000,
          output: 8000,
        },
      } as ModelsDev.Model,
    })

    // Total: 40000, context: 50000, output reservation: 8000
    // Usable: 50000 - 8000 = 42000
    // 40000 < 42000, so should be false
    expect(result).toBe(false)
  })

  test("should handle cache tokens correctly", () => {
    const result = SessionCompaction.isOverflow({
      tokens: {
        input: 20000,
        output: 10000,
        reasoning: 0,
        cache: { read: 15000, write: 0 },
      },
      model: {
        limit: {
          context: 50000,
          output: 4096,
        },
      } as ModelsDev.Model,
    })

    // Total: 20000 + 10000 + 15000 = 45000
    // Usable: 50000 - 4096 = 45904
    // 45000 < 45904, should be false
    expect(result).toBe(false)
  })
})

describe("SessionCompaction.prune", () => {
  test("should run prune without errors on session with tool outputs", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})

        // Create a user message
        const userMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          time: {
            created: Date.now(),
          },
        })) as MessageV2.User

        await Session.updatePart({
          type: "text",
          sessionID: session.id,
          messageID: userMsg.id,
          id: Identifier.ascending("part"),
          text: "test message 1",
          time: {
            start: Date.now(),
            end: Date.now(),
          },
        })

        // Create assistant message with tool output
        const assistantMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "assistant",
          parentID: userMsg.id,
          sessionID: session.id,
          system: [],
          mode: "chat",
          path: {
            cwd: projectRoot,
            root: projectRoot,
          },
          cost: 0,
          tokens: {
            output: 0,
            input: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: "test-model",
          providerID: "test-provider",
          time: {
            created: Date.now(),
          },
        })) as MessageV2.Assistant

        await Session.updatePart({
          type: "tool",
          sessionID: session.id,
          messageID: assistantMsg.id,
          id: Identifier.ascending("part"),
          callID: "test-call-id",
          tool: "test_tool",
          state: {
            status: "completed",
            input: {},
            output: "test output",
            title: "Test Tool",
            metadata: {},
            time: {
              start: Date.now(),
              end: Date.now(),
            },
          },
        })

        // Run prune should not throw
        await expect(SessionCompaction.prune({ sessionID: session.id })).resolves.toBeUndefined()

        await Session.remove(session.id)
      },
    })
  })

  test("should not prune recent tool outputs within PRUNE_PROTECT", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})

        const userMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          time: {
            created: Date.now(),
          },
        })) as MessageV2.User

        await Session.updatePart({
          type: "text",
          sessionID: session.id,
          messageID: userMsg.id,
          id: Identifier.ascending("part"),
          text: "test",
          time: {
            start: Date.now(),
            end: Date.now(),
          },
        })

        const assistantMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "assistant",
          parentID: userMsg.id,
          sessionID: session.id,
          system: [],
          mode: "chat",
          path: {
            cwd: projectRoot,
            root: projectRoot,
          },
          cost: 0,
          tokens: {
            output: 0,
            input: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: "test-model",
          providerID: "test-provider",
          time: {
            created: Date.now(),
          },
        })) as MessageV2.Assistant

        // Create small tool output (under PRUNE_PROTECT = 40000)
        const smallTool = await Session.updatePart({
          type: "tool",
          sessionID: session.id,
          messageID: assistantMsg.id,
          id: Identifier.ascending("part"),
          callID: "test-call-id-2",
          tool: "test_tool",
          state: {
            status: "completed",
            input: {},
            output: "small output",
            title: "Test Tool",
            metadata: {},
            time: {
              start: Date.now(),
              end: Date.now(),
            },
          },
        })

        const userMsg2 = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          time: {
            created: Date.now(),
          },
        })) as MessageV2.User

        await Session.updatePart({
          type: "text",
          sessionID: session.id,
          messageID: userMsg2.id,
          id: Identifier.ascending("part"),
          text: "test 2",
          time: {
            start: Date.now(),
            end: Date.now(),
          },
        })

        await SessionCompaction.prune({ sessionID: session.id })

        const parts = await Session.getParts(assistantMsg.id)
        const toolPart = parts.find((p) => p.id === smallTool.id) as MessageV2.ToolPart | undefined

        // Should NOT be compacted because output is too small
        expect(toolPart).toBeDefined()
        if (toolPart?.state.status === "completed") {
          expect(toolPart.state.time.compacted).toBeUndefined()
        }

        await Session.remove(session.id)
      },
    })
  })

  test("should skip pruning for messages with fewer than 2 user turns", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({})

        const userMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          time: {
            created: Date.now(),
          },
        })) as MessageV2.User

        await Session.updatePart({
          type: "text",
          sessionID: session.id,
          messageID: userMsg.id,
          id: Identifier.ascending("part"),
          text: "only one user message",
          time: {
            start: Date.now(),
            end: Date.now(),
          },
        })

        const assistantMsg = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "assistant",
          parentID: userMsg.id,
          sessionID: session.id,
          system: [],
          mode: "chat",
          path: {
            cwd: projectRoot,
            root: projectRoot,
          },
          cost: 0,
          tokens: {
            output: 0,
            input: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: "test-model",
          providerID: "test-provider",
          time: {
            created: Date.now(),
          },
        })) as MessageV2.Assistant

        const toolPart = await Session.updatePart({
          type: "tool",
          sessionID: session.id,
          messageID: assistantMsg.id,
          id: Identifier.ascending("part"),
          callID: "test-call-id-3",
          tool: "test_tool",
          state: {
            status: "completed",
            input: {},
            output: "x".repeat(50000), // Large output
            title: "Test Tool",
            metadata: {},
            time: {
              start: Date.now(),
              end: Date.now(),
            },
          },
        })

        await SessionCompaction.prune({ sessionID: session.id })

        const parts = await Session.getParts(assistantMsg.id)
        const tool = parts.find((p) => p.id === toolPart.id) as MessageV2.ToolPart | undefined

        // Should NOT be compacted due to insufficient turns
        if (tool?.state.status === "completed") {
          expect(tool.state.time.compacted).toBeUndefined()
        }

        await Session.remove(session.id)
      },
    })
  })
})
