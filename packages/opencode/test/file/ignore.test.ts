import { test, expect } from "bun:test"
import { FileIgnore } from "../../src/file/ignore"
import path from "path"

test("match nested and non-nested", () => {
  expect(FileIgnore.match(path.join("node_modules", "index.js"))).toBe(true)
  expect(FileIgnore.match("node_modules")).toBe(true)
  expect(FileIgnore.match(path.join("node_modules", ""))).toBe(true)
  expect(FileIgnore.match(path.join("node_modules", "bar"))).toBe(true)
  expect(FileIgnore.match(path.join("node_modules", "bar", ""))).toBe(true)
})
