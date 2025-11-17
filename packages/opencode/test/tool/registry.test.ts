import { describe, expect, test } from "bun:test"
import { ToolRegistry } from "../../src/tool/registry"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import path from "path"
import type { Agent } from "../../src/agent/agent"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("ToolRegistry.enabled", () => {
  test("should disable patch tool by default", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: { "*": "allow" },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["patch"]).toBe(false)
      },
    })
  })

  test("should disable edit, patch, and write when edit is denied", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "deny",
            bash: { "*": "allow" },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["edit"]).toBe(false)
        expect(enabled["patch"]).toBe(false)
        expect(enabled["write"]).toBe(false)
      },
    })
  })

  test("should disable bash when permission is deny", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: { "*": "deny" },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["bash"]).toBe(false)
      },
    })
  })

  test("should handle bash wildcard deny with nested permissions", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: {
              "*": "deny",
            },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["bash"]).toBe(false)
      },
    })
  })

  test("should not disable bash with mixed permissions", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: {
              "*": "deny",
              "git*": "allow",
            },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        // Should not fully deny bash since there are specific allows
        expect(enabled["bash"]).toBeUndefined()
      },
    })
  })

  test("should disable webfetch when permission is deny", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: { "*": "allow" },
            webfetch: "deny",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["webfetch"]).toBe(false)
      },
    })
  })

  test("should handle all permissions allowed", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "allow",
            bash: { "*": "allow" },
            webfetch: "allow",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        // Only patch should be explicitly disabled
        expect(enabled["patch"]).toBe(false)
        // Other tools should not be explicitly disabled
        expect(enabled["edit"]).toBeUndefined()
        expect(enabled["bash"]).toBeUndefined()
        expect(enabled["webfetch"]).toBeUndefined()
      },
    })
  })

  test("should handle multiple denied permissions", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const agent: Agent.Info = {
          name: "Test Agent",
          mode: "all",
          builtIn: false,
          tools: {},
          options: {},
          permission: {
            edit: "deny",
            bash: { "*": "deny" },
            webfetch: "deny",
          },
        }

        const enabled = await ToolRegistry.enabled("provider", "model", agent)

        expect(enabled["edit"]).toBe(false)
        expect(enabled["patch"]).toBe(false)
        expect(enabled["write"]).toBe(false)
        expect(enabled["bash"]).toBe(false)
        expect(enabled["webfetch"]).toBe(false)
      },
    })
  })
})

// Note: Tests for ToolRegistry.register, .ids(), and .tools() are skipped
// because they require full plugin system initialization which attempts to
// install packages during testing. The critical functionality (permission
// handling in .enabled()) is fully tested above.
