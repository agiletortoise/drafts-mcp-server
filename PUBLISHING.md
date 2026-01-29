# Publishing Guide

This guide walks through testing and publishing the Drafts MCP Server to npm.

## Pre-Publishing Checklist

- [ ] All features tested locally
- [ ] README.md is complete and accurate
- [ ] package.json version is updated
- [ ] CHANGELOG.md is updated
- [ ] All dependencies are correct versions
- [ ] TypeScript compiles without errors
- [ ] MCP Inspector testing completed
- [ ] Examples tested with Claude Desktop or Cursor
- [ ] LICENSE file is present

## Local Testing

### 1. Build the Package

```bash
npm install
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 2. Test with MCP Inspector

The MCP Inspector provides a web UI for testing tools:

```bash
npm run inspector
```

This will:
- Start the server
- Open a web interface
- Allow you to test each tool interactively

Test each tool to ensure they work correctly.

### 3. Test Local Installation

You can test the package locally before publishing:

```bash
# Create a test link
npm link

# In another terminal, test the command
drafts-mcp

# Or test with npx
npx .
```

### 4. Test with Claude Desktop

Create a test configuration pointing to your local build:

```json
{
  "mcpServers": {
    "drafts-test": {
      "command": "node",
      "args": ["/full/path/to/drafts-mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop and test various prompts:
- "List my Drafts workspaces"
- "Create a draft with content 'Test'"
- "Search for drafts containing 'meeting'"

### 5. Test Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

This shows you exactly what files will be included in the package.

## Publishing to npm

### First-Time Setup

1. **Create npm Account**
   - Go to https://www.npmjs.com/signup
   - Create an account (or use existing)

2. **Login to npm CLI**
   ```bash
   npm login
   ```

3. **Verify Organization Access**
   If publishing under `@agiletortoise` scope:
   - Ensure you have access to the organization
   - Or create the organization on npmjs.com

### Publishing Steps

1. **Update Version Number**

   Update the version in `package.json` following [Semantic Versioning](https://semver.org/):
   - **Patch** (1.0.x): Bug fixes, minor changes
   - **Minor** (1.x.0): New features, backwards compatible
   - **Major** (x.0.0): Breaking changes

   ```bash
   # For patch updates
   npm version patch
   
   # For minor updates
   npm version minor
   
   # For major updates
   npm version major
   ```

2. **Update CHANGELOG.md**

   Document all changes in the changelog.

3. **Build the Package**

   ```bash
   npm run build
   ```

4. **Publish**

   For scoped packages (recommended):
   ```bash
   # First time (make it public)
   npm publish --access public
   
   # Subsequent updates
   npm publish
   ```

   For unscoped packages:
   ```bash
   npm publish
   ```

5. **Verify Publication**

   Check that your package is live:
   ```bash
   npm view @agiletortoise/drafts-mcp-server
   ```

   Or visit: https://www.npmjs.com/package/@agiletortoise/drafts-mcp-server

### Post-Publication

1. **Tag the Release in Git**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create GitHub Release**
   - Go to your GitHub repository
   - Create a new release using the tag
   - Copy relevant CHANGELOG content

3. **Test Installation**
   ```bash
   npx @agiletortoise/drafts-mcp-server
   ```

4. **Update Documentation**
   - Submit to MCP server registries
   - Update any external documentation

## Updating the Package

When releasing updates:

1. Make your changes
2. Update CHANGELOG.md
3. Update version: `npm version patch|minor|major`
4. Build: `npm run build`
5. Publish: `npm publish`
6. Tag: `git tag v1.0.x && git push origin v1.0.x`

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check organization membership
- Verify package name isn't taken

### "Package name too similar to existing package"

- Choose a more unique name
- Use a scoped package: `@yourorg/package-name`

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Testing Published Package

After publishing, test with a fresh installation:

```bash
# In a different directory
npx @agiletortoise/drafts-mcp-server
```

## Best Practices

1. **Semantic Versioning**: Always follow semver
2. **Changelog**: Keep it updated with every release
3. **Testing**: Test locally before publishing
4. **Documentation**: Keep README in sync with features
5. **Breaking Changes**: Clearly document in CHANGELOG
6. **Security**: Never commit secrets or API keys
7. **Dependencies**: Keep dependencies up to date
8. **Size**: Keep package size small (check with `npm pack`)

## Maintenance

### Regular Updates

- Monitor GitHub issues
- Update dependencies regularly
- Test with new MCP specification versions
- Test with new Drafts releases
- Keep TypeScript and Node.js versions current

### Deprecation

If you need to deprecate a version:

```bash
npm deprecate @agiletortoise/drafts-mcp-server@1.0.0 "Use version 2.0.0 instead"
```

### Unpublishing

Only works within 72 hours of publication:

```bash
npm unpublish @agiletortoise/drafts-mcp-server@1.0.0
```

## Packaging as MCPB for Claude Desktop Directory

MCPB (MCP Bundle) is the package format for submitting MCP servers to the Claude Desktop extension directory.

### Prerequisites

- Completed npm publishing steps above
- `manifest.json` with all required fields
- Icon file at `assets/icon.png`
- Privacy policy URL publicly accessible

### Install the MCPB CLI

Anthropic provides an official CLI tool for creating MCPB packages:

```bash
npm install -g @anthropic-ai/mcpb
```

### Package Structure

The MCPB package will contain:

```
drafts-mcp-server.mcpb (zip archive)
├── manifest.json          # Package metadata and tool definitions
├── assets/
│   └── icon.png          # Extension icon (recommended: 128x128)
├── dist/
│   └── index.js          # Compiled server entry point
├── package.json          # Node.js dependencies
└── node_modules/         # Dependencies (bundled automatically)
```

### Creating the MCPB Package

1. **Ensure the project is built**

   ```bash
   npm install
   npm run build
   ```

2. **Initialize manifest (if not already created)**

   If you don't have a `manifest.json`, the CLI can create one interactively:

   ```bash
   mcpb init
   ```

   This project already has a `manifest.json`, so skip this step.

3. **Verify manifest.json**

   Ensure `manifest.json` includes:
   - `manifest_version`: "0.3" or higher
   - `name`, `version`, `description`
   - `author` with name and contact info
   - `server` configuration with entry point
   - `tools` array listing all tools
   - `icon` path to PNG icon
   - `privacy_policies` array with HTTPS URLs
   - `compatibility` specifying platforms (darwin for macOS)

4. **Create the MCPB bundle**

   ```bash
   mcpb pack
   ```

   This creates a `.mcpb` file (e.g., `drafts-mcp-server-1.0.3.mcpb`) containing all necessary files.

### Manual Packaging (Alternative)

If you prefer not to use the CLI, you can create the bundle manually:

```bash
zip -r drafts-mcp-server-1.0.3.mcpb \
  manifest.json \
  package.json \
  assets/ \
  dist/ \
  node_modules/ \
  LICENSE \
  README.md
```

### Tool Annotations (Required for Directory)

Every tool must have safety annotations in `src/index.ts`:

```typescript
{
  name: 'drafts_get_draft',
  description: 'Get a specific draft by its UUID',
  inputSchema: { ... },
  annotations: {
    title: 'Get Draft',
    readOnlyHint: true,      // true if tool doesn't modify data
    destructiveHint: false,  // true if tool can destroy data
    idempotentHint: true,    // true if repeated calls have no additional effect
    openWorldHint: false,    // true if tool interacts with external services
  },
}
```

Annotation guidelines:
- **readOnlyHint**: `true` for list/get/search operations
- **destructiveHint**: `true` for update/delete/trash operations
- **idempotentHint**: `true` if calling again with same args has no additional effect
- **openWorldHint**: `true` if the tool may interact with external services

### Submitting to Claude Desktop Directory

1. **Review submission requirements**

   See: https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide

2. **Pre-submission checklist**

   - [ ] manifest.json follows v0.3 spec
   - [ ] All tools have accurate safety annotations
   - [ ] Privacy policy URL is publicly accessible
   - [ ] Icon is included and displays correctly
   - [ ] Server works with Claude Desktop locally
   - [ ] Documentation is complete

3. **Submit for review**

   Follow the submission process in the Claude Help Center article above.

### Testing the MCPB Locally

Before submitting, test the package locally:

1. **Extract and verify contents**

   ```bash
   unzip -l drafts-mcp-server-1.0.3.mcpb
   ```

2. **Test installation**

   ```bash
   mkdir test-install && cd test-install
   unzip ../drafts-mcp-server-1.0.3.mcpb
   npm install  # if node_modules not included
   node dist/index.js
   ```

3. **Verify manifest**

   Check that all fields are present and valid JSON:

   ```bash
   cat manifest.json | jq .
   ```

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools)
- [MCPB Manifest Specification](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md)
- [Local MCP Server Submission Guide](https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
