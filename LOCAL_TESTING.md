# Local Testing Guide

This guide explains how to test the Drafts MCP Server locally before publishing to npm.

## Quick Start

### 1. Extract and Setup

```bash
# Extract the archive (if you downloaded it)
unzip drafts-mcp-server.zip
# or
tar -xzf drafts-mcp-server.tar.gz

# Navigate to the directory
cd drafts-mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### 2. Test with MCP Inspector

The easiest way to test the server is with the MCP Inspector:

```bash
npm run inspector
```

This will:
- Start the MCP server
- Open a web interface in your browser
- Let you test each tool interactively

**Try these tools:**
- `drafts_list_workspaces` - Should list your Drafts workspaces
- `drafts_create_draft` - Create a test draft

### 3. Test with Claude Desktop

To test with Claude Desktop, you need to point it to your local build.

**Edit:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "drafts": {
      "command": "node",
      "args": ["/Users/YOURNAME/path/to/drafts-mcp-server/dist/index.js"]
    }
  }
}
```

**Important:** Replace `/Users/YOURNAME/path/to/drafts-mcp-server` with the actual absolute path to your project.

**Find the absolute path:**
```bash
cd drafts-mcp-server
pwd
# Copy this path and use it in the config above
```

**Restart Claude Desktop** after updating the config.

### 4. Test with Cursor

Similar to Claude Desktop:

**Edit:** `.cursor/mcp.json` (in your project) or global Cursor settings

```json
{
  "mcpServers": {
    "drafts": {
      "command": "node",
      "args": ["/absolute/path/to/drafts-mcp-server/dist/index.js"]
    }
  }
}
```

**Restart Cursor** after updating.

## Grant Permissions

The first time you run the server, macOS will ask for permissions:

1. Open **System Preferences** → **Security & Privacy** → **Privacy** → **Automation**
2. Find your MCP client (Claude Desktop, Cursor, node, etc.)
3. Check the box next to **Drafts**
4. Restart your MCP client

## Testing Checklist

Test each tool to make sure everything works:

### Basic Operations
- [ ] `drafts_list_workspaces` - Lists your workspaces
- [ ] `drafts_create_draft` - Creates a new draft
- [ ] `drafts_get_draft` - Retrieves the draft you just created
- [ ] `drafts_search` - Searches for drafts

### Workspace Operations
- [ ] `drafts_get_drafts` - Gets drafts from a workspace
- [ ] Filter with query parameter

### Tagging
- [ ] `drafts_add_tags` - Adds tags to a draft

### Actions
- [ ] `drafts_list_actions` - Lists your actions
- [ ] `drafts_run_action` - Runs an action on a draft

### Status Management
- [ ] `drafts_flag` - Flags a draft
- [ ] `drafts_archive` - Archives a draft
- [ ] `drafts_trash` - Moves draft to trash

## Example Prompts for Claude/Cursor

Once configured, try these prompts:

```
"List all my Drafts workspaces"

"Create a new draft with content 'Testing MCP server'"

"Search for drafts containing 'test'"

"Get all drafts from my Inbox workspace"

"Create a draft tagged 'mcp-test' with content 'Hello from MCP'"
```

## Troubleshooting

### "Command not found" or "Cannot find module"

**Solution:** Make sure you've run `npm install` and `npm run build`

### "Drafts got an error: Can't get workspace"

**Solution:** 
- Check that Drafts is installed and running
- Verify the workspace name is spelled correctly (case-sensitive)
- Make sure you've granted automation permissions

### Server doesn't start

**Solution:**
1. Check that Node.js is installed: `node --version` (should be 18+)
2. Make sure the path in your config is absolute, not relative
3. Check for typos in the config JSON
4. Look at Claude Desktop logs for errors

### Permission denied

**Solution:**
1. Open **System Preferences** → **Security & Privacy**
2. Go to **Privacy** → **Automation**
3. Find your MCP client and check **Drafts**
4. Restart the MCP client

### Tools not appearing in Claude/Cursor

**Solution:**
1. Verify the config file is saved correctly
2. Restart the MCP client completely (quit and reopen)
3. Check the config file has valid JSON (no trailing commas, etc.)
4. Look for error messages in the MCP client

## Development Workflow

If you're making changes to the code:

### Watch Mode

Run TypeScript in watch mode to automatically rebuild on changes:

```bash
npm run watch
```

Keep this running in one terminal, then restart your MCP client when you make changes.

### Manual Testing Flow

1. Make code changes
2. `npm run build` (or use watch mode)
3. Restart your MCP client
4. Test the changes

### Using MCP Inspector

The inspector is great for quick testing without restarting Claude/Cursor:

```bash
npm run inspector
```

It automatically reloads when you rebuild.

## After Testing

Once you've verified everything works locally:

1. Review `PUBLISHING.md` for publishing instructions
2. Update version in `package.json` if needed
3. Update `CHANGELOG.md` with any changes
4. Follow the publishing steps

## Need Help?

- Check the main `README.md` for detailed documentation
- See `CONTRIBUTING.md` for development guidelines
- Review `EXAMPLES.md` for configuration examples
- Check the Drafts AppleScript documentation: https://getdrafts.com/scripting/applescript
- Review MCP documentation: https://modelcontextprotocol.io
