# Contributing to Drafts MCP Server

Thank you for your interest in contributing to the Drafts MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, constructive, and professional. We're all here to make this project better.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Test with the latest version
3. Verify it's a server issue, not a Drafts or MCP client issue

When creating a bug report, include:
- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**:
  - macOS version
  - Drafts version
  - Node.js version
  - MCP client (Claude Desktop, Cursor, etc.)
- **Error Messages**: Full error messages or stack traces
- **Logs**: Relevant log output

### Suggesting Features

Feature requests are welcome! When suggesting a feature:
1. Check existing issues for similar requests
2. Clearly describe the feature and its use case
3. Explain why it would be valuable
4. Consider how it fits with existing features

### Pull Requests

#### Before You Start

1. Create an issue to discuss major changes first
2. Check that your idea hasn't already been implemented
3. Ensure you can test the changes with Drafts

#### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/drafts-mcp-server.git
cd drafts-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run in watch mode during development
npm run watch
```

#### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Code**
   - Follow the existing code style (TypeScript, ESM modules)
   - Add JSDoc comments for public functions
   - Keep functions focused and single-purpose
   - Handle errors appropriately

3. **Test Your Changes**
   ```bash
   # Build
   npm run build
   
   # Test with MCP Inspector
   npm run inspector
   
   # Test with a real MCP client
   # (Update config to point to your local build)
   ```

4. **Document Changes**
   - Update README.md if adding features
   - Update CHANGELOG.md
   - Add JSDoc comments to new functions
   - Update examples if relevant

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: add workspace creation tool"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a Pull Request on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if applicable

## Code Style Guide

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Provide types for all functions
- Use interfaces for data structures

Example:
```typescript
interface Draft {
  uuid: string;
  content: string;
  tags?: string[];
}

async function getDraft(uuid: string): Promise<Draft | null> {
  // Implementation
}
```

### AppleScript

- Escape user input properly
- Handle errors gracefully
- Use consistent formatting
- Comment complex scripts

Example:
```typescript
const script = `
  tell application "Drafts"
    try
      set targetDraft to first draft whose uuid is "${escapedUuid}"
      return content of targetDraft
    on error errMsg
      return "ERROR: " & errMsg
    end try
  end tell
`;
```

### Error Handling

Always handle errors and provide useful messages:

```typescript
try {
  const result = await executeAppleScript(script);
  return parseResult(result);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to get draft: ${errorMessage}`);
}
```

### Documentation

Add JSDoc comments to all exported functions:

```typescript
/**
 * Create a new draft in Drafts
 * @param content - The content of the draft
 * @param tags - Optional array of tags to add
 * @param flagged - Whether to flag the draft
 * @returns UUID of the created draft
 * @throws Error if draft creation fails
 */
export async function createDraft(
  content: string,
  tags?: string[],
  flagged?: boolean
): Promise<string> {
  // Implementation
}
```

## Project Structure

```
drafts-mcp-server/
├── src/
│   ├── index.ts           # Main MCP server (tool definitions, handlers)
│   ├── drafts.ts          # Drafts operations (high-level functions)
│   └── applescript.ts     # AppleScript utilities (low-level execution)
├── dist/                  # Compiled output (git-ignored)
├── package.json           # NPM package configuration
├── tsconfig.json          # TypeScript configuration
└── README.md             # User documentation
```

### File Responsibilities

- **index.ts**: MCP server setup, tool definitions, request handlers
- **drafts.ts**: Drafts-specific operations, business logic
- **applescript.ts**: Generic AppleScript execution, string escaping

## Testing Guidelines

### Manual Testing

1. **Build the package**
   ```bash
   npm run build
   ```

2. **Test with MCP Inspector**
   ```bash
   npm run inspector
   ```
   Test each tool with various inputs

3. **Test with real MCP client**
   Configure Claude Desktop or Cursor to use your local build

4. **Test edge cases**
   - Empty strings
   - Special characters (quotes, newlines, etc.)
   - Non-existent UUIDs
   - Invalid workspace names

### What to Test

For each new tool or change:
- ✅ Normal operation
- ✅ Error handling
- ✅ Edge cases
- ✅ Special characters in input
- ✅ Missing required parameters
- ✅ Invalid parameter types

## Adding New Tools

To add a new tool:

1. **Add to drafts.ts**
   ```typescript
   export async function yourNewFunction(params: YourParams): Promise<Result> {
     const script = `
       tell application "Drafts"
         // Your AppleScript
       end tell
     `;
     return await executeAppleScript(script);
   }
   ```

2. **Add to TOOLS array in index.ts**
   ```typescript
   {
     name: 'drafts_your_tool',
     description: 'Clear description of what it does',
     inputSchema: {
       type: 'object',
       properties: {
         param1: {
           type: 'string',
           description: 'Description of parameter'
         }
       },
       required: ['param1']
     }
   }
   ```

3. **Add handler in index.ts**
   ```typescript
   case 'drafts_your_tool': {
     const { param1 } = args as { param1: string };
     const result = await drafts.yourNewFunction(param1);
     return {
       content: [{
         type: 'text',
         text: JSON.stringify(result, null, 2)
       }]
     };
   }
   ```

4. **Document in README.md**

5. **Update CHANGELOG.md**

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Review the MCP documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
