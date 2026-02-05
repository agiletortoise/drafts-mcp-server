# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- HTTP transport support (Streamable HTTP + SSE fallback) for clients like LM Studio and Open WebUI
- Environment variables for HTTP configuration (`MCP_HTTP_HOST`, `MCP_HTTP_PORT`, `MCP_HTTP_PATH`)
- JSON response mode (`MCP_JSON_RESPONSE=true` or `--json-response` flag) for clients that expect direct JSON instead of SSE
- Verbose logging mode (`MCP_VERBOSE=true` or `--verbose` flag)
- Detailed AppleScript execution logging (scripts, results, execution time)

## [1.0.5] - 2026-01-31

### Fixed
- Non-US date locale handling - dates are now formatted as ISO 8601 strings https://github.com/agiletortoise/drafts-mcp-server/commit/fea1efaf1fc2984567e9baa12decbb2cc630cbc0

### Changes
- Improve documentation.

## [1.0.4] - 2026-01-29

### Added
- Add safety annontations https://github.com/agiletortoise/drafts-mcp-server/commit/e3f647f7efb46442f500e2dc9534d73b4e0eb405

## [1.0.3] - 2026-01-28

### Added
- Incorporate changes to tag properties

### Changes
- Improve documentation.

## [1.0.2] - 2025-01-22
- Fix for `drafts_search`

## [1.0.1] - 2025-01-22

### Changes
- Improve documentation.

## [1.0.0] - 2025-01-22

### Added
- Initial release of Drafts MCP Server

### Security
- Proper string escaping for AppleScript injection prevention
- Safe execution of user-provided content