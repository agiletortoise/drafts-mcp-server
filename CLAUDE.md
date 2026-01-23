# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript to dist/
npm run watch        # Build in watch mode for development
npm run inspector    # Test server with MCP Inspector web interface
node dist/index.js   # Run the server directly
```

## Architecture

This is an MCP (Model Context Protocol) server that enables AI assistants to interact with the macOS Drafts app via AppleScript. It uses stdio transport for communication.

### Source Files

- **src/index.ts**: MCP server entry point. Defines the `TOOLS` array with all tool schemas, the `DraftsMCPServer` class, and request handlers that route tool calls to drafts.ts functions.

- **src/drafts.ts**: High-level Drafts operations. Each function builds an AppleScript, executes it via `executeAppleScript()`, and parses the result. Contains interfaces: `Workspace`, `Draft`, `Action`.

- **src/applescript.ts**: Low-level AppleScript execution utilities. `executeAppleScript()` runs scripts via `osascript`, `escapeAppleScriptString()` sanitizes user input for safe AppleScript embedding.

### Adding a New Tool

1. Add the function to `src/drafts.ts` with AppleScript logic
2. Add tool schema to `TOOLS` array in `src/index.ts`
3. Add case handler in the switch statement in `setupHandlers()`

### Key Patterns

- All user input must be escaped with `escapeAppleScriptString()` before embedding in AppleScript
- AppleScript errors are caught with `try/on error` blocks and return "ERROR: " or "NOT_FOUND" sentinel values
- Tool handlers return `{ content: [{ type: 'text', text: '...' }], isError?: boolean }`
- Draft identifiers use UUIDs from Drafts app

## Requirements

- macOS only (AppleScript)
- Node.js 18+
- Drafts app installed
- First run requires granting Automation permissions in System Preferences
