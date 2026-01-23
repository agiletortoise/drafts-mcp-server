# Quick Reference

A quick reference guide for common Drafts MCP Server operations.

## Installation

```bash
# Run without installation
npx @agiletortoise/drafts-mcp-server

# Or install globally
npm install -g @agiletortoise/drafts-mcp-server
```

## Claude Desktop Config

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

## Common Prompts

### Listing & Viewing

| Task | Example Prompt |
|------|----------------|
| List workspaces | "Show me all my Drafts workspaces" |
| View drafts in workspace | "Get all drafts from my 'Work' workspace" |
| Search drafts | "Search for drafts containing 'meeting notes'" |
| View specific draft | "Show me the draft with UUID abc-123" |
| List actions | "What actions are available in Drafts?" |

### Creating & Editing

| Task | Example Prompt |
|------|----------------|
| Create draft | "Create a draft with content 'My new note'" |
| Create with tags | "Create a draft 'Todo list' tagged 'work' and 'urgent'" |
| Update draft | "Update draft abc-123 with new content 'Updated text'" |
| Add tags | "Add tags 'important' and 'review' to draft abc-123" |

### Organizing

| Task | Example Prompt |
|------|----------------|
| Flag draft | "Flag the draft with UUID abc-123" |
| Unflag draft | "Unflag draft abc-123" |
| Archive draft | "Archive draft abc-123" |
| Trash draft | "Move draft abc-123 to trash" |

### Running Actions

| Task | Example Prompt |
|------|----------------|
| Run action | "Run the 'Send to Email' action on draft abc-123" |
| Batch actions | "Find all drafts tagged 'review' and run 'Archive' on them" |

## Tool Reference

### drafts_list_workspaces
```typescript
// No parameters
```

### drafts_get_drafts
```typescript
{
  workspaceName: "Inbox",
  query?: "optional search term"  // Optional filter
}
```

### drafts_create_draft
```typescript
{
  content: "Draft content here",
  tags?: ["tag1", "tag2"],        // Optional
  flagged?: true                   // Optional
}
```

### drafts_get_draft
```typescript
{
  uuid: "draft-uuid-here"
}
```

### drafts_update_draft
```typescript
{
  uuid: "draft-uuid-here",
  content: "New content"
}
```

### drafts_add_tags
```typescript
{
  uuid: "draft-uuid-here",
  tags: ["tag1", "tag2"]
}
```

### drafts_search
```typescript
{
  query: "search term"
}
```

### drafts_run_action
```typescript
{
  draftUuid: "draft-uuid-here",
  actionName: "Action Name"
}
```

### drafts_list_actions
```typescript
// No parameters
```

### drafts_flag
```typescript
{
  uuid: "draft-uuid-here",
  flagged: true  // or false to unflag
}
```

### drafts_archive
```typescript
{
  uuid: "draft-uuid-here"
}
```

### drafts_trash
```typescript
{
  uuid: "draft-uuid-here"
}
```

## Common Workflows

### Morning Review
```
"Get all drafts from my 'Inbox' workspace created today"
"Flag any drafts containing 'urgent' or 'important'"
"Create a draft with today's date as title tagged 'daily-note'"
```

### Project Organization
```
"Search for all drafts tagged 'project-alpha'"
"Add tag 'completed' to all drafts in 'Done' workspace"
"Archive all drafts tagged 'completed' and 'project-alpha'"
```

### Content Aggregation
```
"Get all drafts from 'Meeting Notes' from this week"
"Create a summary draft with all action items"
"Tag the summary with 'weekly-review'"
```

### Action Automation
```
"Find all drafts tagged 'email'"
"Run 'Send to Email' action on each one"
"Archive them after sending"
```

## Tips & Tricks

### Getting UUIDs
Most operations need draft UUIDs. Get them by:
1. Listing drafts in a workspace
2. Searching for drafts
3. Creating a draft (returns UUID)

### Workspace Names
Workspace names are case-sensitive and must match exactly:
- ✅ "Inbox"
- ❌ "inbox"
- ❌ "INBOX"

### Query Syntax
The query parameter uses Drafts' search syntax:
- `tag:work` - Drafts tagged "work"
- `flagged:true` - Flagged drafts
- `project` - Drafts containing "project"

### Special Characters
The server handles escaping automatically, but be aware:
- Quotes in content are escaped
- Newlines are preserved
- Unicode characters are supported

### Error Messages
Common errors and solutions:

| Error | Solution |
|-------|----------|
| "Can't get workspace..." | Check workspace name spelling (case-sensitive) |
| "Can't get draft..." | Verify UUID is correct |
| "Can't get action..." | Check action name spelling |
| Permission errors | Grant automation permissions in System Preferences |

## Permissions Setup

1. **System Preferences** → **Security & Privacy** → **Privacy** → **Automation**
2. Find your MCP client (Claude Desktop, Cursor, etc.)
3. Check the box next to **Drafts**
4. Restart your MCP client

## Development

```bash
# Clone and setup
git clone https://github.com/agiletortoise/drafts-mcp-server.git
cd drafts-mcp-server
npm install

# Build
npm run build

# Test with inspector
npm run inspector

# Watch mode for development
npm run watch
```

## Resources

- [Full Documentation](README.md)
- [GitHub Repository](https://github.com/agiletortoise/drafts-mcp-server)
- [Drafts AppleScript Reference](https://getdrafts.com/scripting/applescript)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Report Issues](https://github.com/agiletortoise/drafts-mcp-server/issues)
