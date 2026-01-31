# Example MCP Client Configurations

This directory contains example configuration files for various MCP clients.

## Claude Desktop

Drag `drafts-mcp-server.mcbp` into Settings > Extensions in the Claude Desktop app, or:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "drafts": {
      "command": "npx",
      "args": ["@agiletortoise/drafts-mcp-server"]
    }
  }
}
```

If you have other servers already configured:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "existing-command"
    },
    "drafts": {
      "command": "npx",
      "args": ["@agiletortoise/drafts-mcp-server"]
    }
  }
}
```

## Cursor

**Location**: `.cursor/mcp.json` (in project) or global settings

```json
{
  "mcpServers": {
    "drafts": {
      "command": "npx",
      "args": ["@agiletortoise/drafts-mcp-server"]
    }
  }
}
```

## Windsurf

**Location**: Windsurf configuration file

```json
{
  "mcpServers": {
    "drafts": {
      "command": "npx",
      "args": ["@agiletortoise/drafts-mcp-server"]
    }
  }
}
```

## Using Global Installation

If you've installed the package globally with `npm install -g @agiletortoise/drafts-mcp-server`:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "drafts-mcp"
    }
  }
}
```

## Using Local Development Build

For development, you can point to your local build:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "node",
      "args": ["/path/to/drafts-mcp-server/dist/index.js"]
    }
  }
}
```

## Troubleshooting

### Server Not Found

Make sure:
1. Node.js is installed and in your PATH
2. The package name is spelled correctly
3. You've restarted your MCP client after adding the configuration

### Permission Issues

Grant automation permissions:
1. **System Preferences** > **Security & Privacy** > **Privacy** > **Automation**
2. Allow your MCP client to control **Drafts**
3. Restart the MCP client

### Multiple Servers

You can run multiple MCP servers simultaneously. Just add them all to the `mcpServers` object:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "npx",
      "args": ["@agiletortoise/drafts-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/username"]
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"]
    }
  }
}
```
