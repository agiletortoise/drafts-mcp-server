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

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
