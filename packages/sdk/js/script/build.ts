#!/usr/bin/env bun

import { fileURLToPath } from "url"
const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

import { $ } from "bun"
import path from "path"
import fs from "fs"

import { createClient } from "@hey-api/openapi-ts"

await $`bun dev generate > ${dir}/openapi.json`.cwd(path.resolve(dir, "../../opencode"))

// Remove src/gen directory if exists (cross-platform)
if (fs.existsSync("src/gen")) {
  fs.rmSync("src/gen", { recursive: true, force: true })
}

await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "OpencodeClient",
      exportFromIndex: false,
      auth: false,
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:4096",
    },
  ],
})
await $`bun prettier --write src/gen`

// Remove dist directory if exists (cross-platform)
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true, force: true })
}

await $`bun tsc`
