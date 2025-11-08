## Project Overview

This project, "opencode", is an open-source, AI-powered coding agent designed to be used in the terminal. It features a client/server architecture, allowing it to be driven by various clients, including a Terminal User Interface (TUI) and potentially a mobile app.

The project is a monorepo managed with pnpm and built with TypeScript. It leverages the Serverless Stack (SST) framework for its backend infrastructure, which is deployed on Cloudflare. It uses Stripe for payments and PlanetScale for its database.

The frontend consists of a documentation website built with Astro and SolidJS, and a desktop GUI built with SolidJS, Vite, and Tailwind CSS.

The core CLI is built with `yargs` and provides a rich set of commands for interacting with the agent.

## Building and Running

This is a pnpm monorepo. The following commands are used for development and building:

*   **Install dependencies:**
    ```bash
    pnpm install
    ```

*   **Run the development server:**
    ```bash
    pnpm dev
    ```
    This will start the main development script for the `opencode` package.

*   **Run in production mode:**
    ```bash
    pnpm start
    ```

*   **Typecheck:**
    ```bash
    pnpm typecheck
    ```
    This will run TypeScript type checking across all workspaces.

*   **Build:**
    ```bash
    pnpm turbo build
    ```
    This will build all the packages in the monorepo.

## Development Conventions

*   **Monorepo:** The project is structured as a monorepo with packages located in the `packages/` directory.
*   **TypeScript:** The entire codebase is written in TypeScript.
*   **Serverless:** The backend is built using a serverless architecture with SST.
*   **Testing:** The project uses `bun:test` for testing. Tests are located in the `test` directory within each package. You can run tests for a specific package by navigating to its directory and running `bun test`. To run all tests for the `opencode` package, you can run the following command from the root of the project:
    ```bash
    pnpm --filter opencode test
    ```
*   **Contributing:** Contribution guidelines are available in `CONTRIBUTING.md`.
