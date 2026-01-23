#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import * as drafts from './drafts.js';

// Define all available tools
const TOOLS: Tool[] = [
  {
    name: 'drafts_list_workspaces',
    description: 'List all workspaces in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'drafts_get_current_workspace',
    description: 'Get the current workspace in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'drafts_get_current',
    description: 'Get the current draft open in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'drafts_get_workspace_drafts',
    description: 'Get drafts from a specific workspace, optionally filtered by folder',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceName: {
          type: 'string',
          description: 'The name of the workspace to get drafts from',
        },
        folder: {
          type: 'string',
          enum: ['inbox', 'archive', 'trash'],
          description: 'Optional folder to filter drafts (inbox, archive, or trash)',
        },
      },
      required: ['workspaceName'],
    },
  },
  {
    name: 'drafts_get_drafts',
    description: 'Get drafts with flexible filtering by content, folder, tag, flagged status, and dates',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Filter drafts whose content contains this text',
        },
        folder: {
          type: 'string',
          enum: ['inbox', 'archive', 'trash'],
          description: 'Filter by folder (inbox, archive, or trash)',
        },
        tag: {
          type: 'string',
          description: 'Filter drafts that have this tag',
        },
        flagged: {
          type: 'boolean',
          description: 'Filter by flagged status',
        },
        createdAfter: {
          type: 'string',
          description: 'Filter drafts created after this date (e.g., "2024-01-01")',
        },
        createdBefore: {
          type: 'string',
          description: 'Filter drafts created before this date (e.g., "2024-12-31")',
        },
        modifiedAfter: {
          type: 'string',
          description: 'Filter drafts modified after this date (e.g., "2024-01-01")',
        },
        modifiedBefore: {
          type: 'string',
          description: 'Filter drafts modified before this date (e.g., "2024-12-31")',
        },
      },
    },
  },
  {
    name: 'drafts_create_draft',
    description: 'Create a new draft with content and optional tags',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content of the new draft',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to add to the draft',
        },
        flagged: {
          type: 'boolean',
          description: 'Whether to flag the draft',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'drafts_get_draft',
    description: 'Get a specific draft by its UUID',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to retrieve',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'drafts_update_draft',
    description: 'Update the content of an existing draft',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to update',
        },
        content: {
          type: 'string',
          description: 'The new content for the draft',
        },
      },
      required: ['uuid', 'content'],
    },
  },
  {
    name: 'drafts_add_tags',
    description: 'Add tags to an existing draft',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add to the draft',
        },
      },
      required: ['uuid', 'tags'],
    },
  },
  {
    name: 'drafts_search',
    description: 'Search for drafts using a query string',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'drafts_run_action',
    description: 'Run a Drafts action on a specific draft',
    inputSchema: {
      type: 'object',
      properties: {
        draftUuid: {
          type: 'string',
          description: 'The UUID of the draft to run the action on',
        },
        actionName: {
          type: 'string',
          description: 'The name of the action to run',
        },
      },
      required: ['draftUuid', 'actionName'],
    },
  },
  {
    name: 'drafts_list_actions',
    description: 'List all available actions in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'drafts_flag',
    description: 'Flag or unflag a draft',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft',
        },
        flagged: {
          type: 'boolean',
          description: 'Whether to flag (true) or unflag (false) the draft',
        },
      },
      required: ['uuid', 'flagged'],
    },
  },
  {
    name: 'drafts_archive',
    description: 'Archive a draft',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to archive',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'drafts_inbox',
    description: 'Move a draft to inbox',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to move to inbox',
        },
      },
      required: ['uuid'],
    },
  },
  {
    name: 'drafts_trash',
    description: 'Move a draft to trash',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to trash',
        },
      },
      required: ['uuid'],
    },
  },
];

/**
 * Main server class
 */
class DraftsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'drafts-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'drafts_list_workspaces': {
            const workspaces = await drafts.listWorkspaces();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(workspaces, null, 2),
                },
              ],
            };
          }

          case 'drafts_get_current_workspace': {
            const workspace = await drafts.getCurrentWorkspace();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(workspace, null, 2),
                },
              ],
            };
          }

          case 'drafts_get_current': {
            const draft = await drafts.getCurrentDraft();
            if (!draft) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'No current draft',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(draft, null, 2),
                },
              ],
            };
          }

          case 'drafts_get_workspace_drafts': {
            const { workspaceName, folder } = args as { workspaceName: string; folder?: 'inbox' | 'archive' | 'trash' };
            const draftsList = await drafts.getWorkspaceDrafts(workspaceName, folder);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(draftsList, null, 2),
                },
              ],
            };
          }

          case 'drafts_get_drafts': {
            const filter = args as drafts.DraftFilter;
            const draftsList = await drafts.getDrafts(filter);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(draftsList, null, 2),
                },
              ],
            };
          }

          case 'drafts_create_draft': {
            const { content, tags, flagged } = args as {
              content: string;
              tags?: string[];
              flagged?: boolean;
            };
            const uuid = await drafts.createDraft(content, tags, flagged);
            return {
              content: [
                {
                  type: 'text',
                  text: `Created draft with UUID: ${uuid}`,
                },
              ],
            };
          }

          case 'drafts_get_draft': {
            const { uuid } = args as { uuid: string };
            const draft = await drafts.getDraft(uuid);
            if (!draft) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Draft not found: ${uuid}`,
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(draft, null, 2),
                },
              ],
            };
          }

          case 'drafts_update_draft': {
            const { uuid, content } = args as { uuid: string; content: string };
            const success = await drafts.updateDraft(uuid, content);
            return {
              content: [
                {
                  type: 'text',
                  text: success ? `Updated draft ${uuid}` : `Failed to update draft ${uuid}`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_add_tags': {
            const { uuid, tags } = args as { uuid: string; tags: string[] };
            const success = await drafts.addTagsToDraft(uuid, tags);
            return {
              content: [
                {
                  type: 'text',
                  text: success
                    ? `Added tags to draft ${uuid}`
                    : `Failed to add tags to draft ${uuid}`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_search': {
            const { query } = args as { query: string };
            const results = await drafts.searchDrafts(query);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'drafts_run_action': {
            const { draftUuid, actionName } = args as { draftUuid: string; actionName: string };
            const success = await drafts.runAction(draftUuid, actionName);
            return {
              content: [
                {
                  type: 'text',
                  text: success
                    ? `Ran action "${actionName}" on draft ${draftUuid}`
                    : `Failed to run action "${actionName}" on draft ${draftUuid}`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_list_actions': {
            const actions = await drafts.listActions();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(actions, null, 2),
                },
              ],
            };
          }

          case 'drafts_flag': {
            const { uuid, flagged } = args as { uuid: string; flagged: boolean };
            const success = await drafts.setDraftFlagged(uuid, flagged);
            return {
              content: [
                {
                  type: 'text',
                  text: success
                    ? `${flagged ? 'Flagged' : 'Unflagged'} draft ${uuid}`
                    : `Failed to ${flagged ? 'flag' : 'unflag'} draft ${uuid}`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_archive': {
            const { uuid } = args as { uuid: string };
            const success = await drafts.archiveDraft(uuid);
            return {
              content: [
                {
                  type: 'text',
                  text: success ? `Archived draft ${uuid}` : `Failed to archive draft ${uuid}`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_inbox': {
            const { uuid } = args as { uuid: string };
            const success = await drafts.inboxDraft(uuid);
            return {
              content: [
                {
                  type: 'text',
                  text: success ? `Moved draft ${uuid} to inbox` : `Failed to move draft ${uuid} to inbox`,
                },
              ],
              isError: !success,
            };
          }

          case 'drafts_trash': {
            const { uuid } = args as { uuid: string };
            const success = await drafts.trashDraft(uuid);
            return {
              content: [
                {
                  type: 'text',
                  text: success ? `Trashed draft ${uuid}` : `Failed to trash draft ${uuid}`,
                },
              ],
              isError: !success,
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Drafts MCP Server running on stdio');
  }
}

// Start the server
const server = new DraftsMCPServer();
server.run().catch(console.error);
