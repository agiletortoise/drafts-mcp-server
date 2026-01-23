# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-22

### Added
- Initial release of Drafts MCP Server
- Workspace management tools:
  - `drafts_list_workspaces` - List all workspaces
- Draft operations:
  - `drafts_get_drafts` - Get drafts from a workspace
  - `drafts_create_draft` - Create new drafts
  - `drafts_get_draft` - Get a specific draft by UUID
  - `drafts_update_draft` - Update draft content
  - `drafts_search` - Search across all drafts
- Tag management:
  - `drafts_add_tags` - Add tags to drafts
- Action execution:
  - `drafts_list_actions` - List available actions
  - `drafts_run_action` - Run actions on drafts
- Draft status management:
  - `drafts_flag` - Flag/unflag drafts
  - `drafts_archive` - Archive drafts
  - `drafts_trash` - Move drafts to trash
- Complete AppleScript integration
- Error handling and user-friendly error messages
- Comprehensive documentation and examples

### Security
- Proper string escaping for AppleScript injection prevention
- Safe execution of user-provided content

## [Unreleased]

### Planned Features
- Support for getting draft metadata (created date, modified date, etc.)
- Batch operations (bulk tagging, bulk archiving, etc.)
- Support for getting tags from drafts
- Support for removing tags from drafts
- Workspace creation and management
- Action group management
- Support for JavaScript actions
- Draft templates
- Version history access
- Syntax support detection

### Ideas for Future Versions
- Support for draft linking and cross-references
- Integration with Drafts URL schemes
- Support for draft versions and revisions
- Bookmark management
- Custom keyboard shortcut execution
- Theme querying
- Draft statistics and analytics
