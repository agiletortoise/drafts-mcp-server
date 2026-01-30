#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import {
  createServer,
  IncomingMessage,
  Server as HttpServer,
  ServerResponse,
} from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  isInitializeRequest,
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
    annotations: {
      title: 'List Workspaces',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'drafts_list_tags',
    description: 'List all tags in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'List Tags',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'drafts_get_tag',
    description: 'Get a tag and its associated drafts',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the tag',
        },
      },
      required: ['name'],
    },
    annotations: {
      title: 'Get Tag',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'drafts_get_current_workspace',
    description: 'Get the current workspace in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'Get Current Workspace',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'drafts_get_current',
    description: 'Get the current draft open in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'Get Current Draft',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Get Workspace Drafts',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Get Drafts',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Create Draft',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
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
    annotations: {
      title: 'Get Draft',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Update Draft',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Add Tags',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Search Drafts',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Run Action',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'drafts_list_actions',
    description: 'List all available actions in Drafts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'List Actions',
      readOnlyHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Flag Draft',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Archive Draft',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Move to Inbox',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
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
    annotations: {
      title: 'Trash Draft',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'drafts_open',
    description: 'Open a draft in the Drafts editor',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {
          type: 'string',
          description: 'The UUID of the draft to open',
        },
      },
      required: ['uuid'],
    },
    annotations: {
      title: 'Open Draft',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
];

/**
 * Verbose logging utility
 */
const VERBOSE = process.env.MCP_VERBOSE === 'true' || process.argv.includes('--verbose');

function log(message: string, data?: unknown): void {
  if (VERBOSE) {
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      console.error(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.error(`[${timestamp}] ${message}`);
    }
  }
}

/**
 * Main server class
 */
type StreamableSession = {
  transport: StreamableHTTPServerTransport;
  server: Server;
};

type SseSession = {
  transport: SSEServerTransport;
  server: Server;
};

class DraftsMCPServer {
  private httpServer?: HttpServer;
  private streamableSessions = new Map<string, StreamableSession>();
  private sseSessions = new Map<string, SseSession>();
  private useJsonResponse = false;
  private isClosing = false;

  constructor() {
    this.setupProcessHandlers();
  }

  private setupProcessHandlers(): void {
    process.on('SIGINT', async () => {
      log('Received SIGINT, closing all sessions');
      await this.closeAllSessions();
      process.exit(0);
    });
  }

  private setupErrorHandling(server: Server): void {
    server.onerror = (error) => {
      console.error('[MCP Error]', error);
      log('Server error occurred', { error: error instanceof Error ? error.message : String(error) });
    };
  }

  private setupHandlers(server: Server): void {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

          case 'drafts_list_tags': {
            const tags = await drafts.listTags();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(tags, null, 2),
                },
              ],
            };
          }

          case 'drafts_get_tag': {
            const { name: tagName } = args as { name: string };
            const tag = await drafts.getTag(tagName);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(tag, null, 2),
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

          case 'drafts_open': {
            const { uuid } = args as { uuid: string };
            const success = await drafts.openDraft(uuid);
            return {
              content: [
                {
                  type: 'text',
                  text: success ? `Opened draft ${uuid}` : `Failed to open draft ${uuid}`,
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

  private createServerInstance(): Server {
    log('Creating new MCP server instance');
    const server = new Server(
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

    this.setupHandlers(server);
    this.setupErrorHandling(server);
    return server;
  }

  private async closeAllSessions(): Promise<void> {
    if (this.isClosing) {
      return; // Prevent re-entrant calls
    }
    this.isClosing = true;

    log(`Closing ${this.streamableSessions.size} streamable HTTP sessions`);
    const streamableSessions = Array.from(this.streamableSessions.values());
    this.streamableSessions.clear();
    for (const session of streamableSessions) {
      try {
        await session.transport.close();
      } catch (error) {
        log('Error closing streamable transport', error);
      }
      try {
        await session.server.close();
      } catch (error) {
        log('Error closing streamable server', error);
      }
    }

    log(`Closing ${this.sseSessions.size} SSE sessions`);
    const sseSessions = Array.from(this.sseSessions.values());
    this.sseSessions.clear();
    for (const session of sseSessions) {
      try {
        await session.transport.close();
      } catch (error) {
        log('Error closing SSE transport', error);
      }
      try {
        await session.server.close();
      } catch (error) {
        log('Error closing SSE server', error);
      }
    }

    if (this.httpServer) {
      log('Closing HTTP server');
      try {
        await new Promise<void>((resolve) => this.httpServer?.close(() => resolve()));
      } catch (error) {
        log('Error closing HTTP server', error);
      }
    }
  }

  private ensureAcceptHeader(req: IncomingMessage, value: string): void {
    if (!req.headers.accept) {
      req.headers.accept = value;
    }
  }

  private getHeaderValue(req: IncomingMessage, name: string): string | undefined {
    const value = req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private async readJsonBody(req: IncomingMessage): Promise<unknown | undefined> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
      log('Received empty request body');
      return undefined;
    }

    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) {
      log('Received empty request body (whitespace only)');
      return undefined;
    }

    const parsed = JSON.parse(raw);
    log('POST body received', parsed);
    return parsed;
  }

  private sendJsonError(res: ServerResponse, status: number, message: string): void {
    if (res.headersSent) {
      return;
    }
    const responseBody = {
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    };
    log('Sending JSON error response', { status, body: responseBody });
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(responseBody));
  }

  private async handleStreamableHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    log(`Streamable HTTP ${req.method} request`, { url: req.url, headers: req.headers });
    
    if (req.method === 'GET') {
      this.ensureAcceptHeader(req, 'text/event-stream');
    } else if (req.method === 'POST') {
      this.ensureAcceptHeader(req, 'application/json, text/event-stream');
    }

    const sessionId = this.getHeaderValue(req, 'mcp-session-id');
    let session = sessionId ? this.streamableSessions.get(sessionId) : undefined;
    log(`Session lookup: ${sessionId ? sessionId : 'no session ID'}, found: ${session ? 'yes' : 'no'}`);
    let parsedBody: unknown | undefined;

    if (req.method === 'POST') {
      try {
        parsedBody = await this.readJsonBody(req);
        if (parsedBody) {
          log(`POST body processed`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.sendJsonError(res, 400, `Parse error: ${errorMessage}`);
        return;
      }

      if (!session && parsedBody !== undefined) {
        const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
        const isInit = messages.some((message) => isInitializeRequest(message));

        if (isInit) {
          log('Initialize request detected, creating new streamable HTTP session');
          const server = this.createServerInstance();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: this.useJsonResponse,
            onsessioninitialized: (newSessionId) => {
              log(`Streamable HTTP session initialized: ${newSessionId}`);
              this.streamableSessions.set(newSessionId, { transport, server });
            },
          });

          transport.onclose = () => {
            const activeSessionId = transport.sessionId;
            if (activeSessionId) {
              log(`Streamable HTTP session closed: ${activeSessionId}`);
              this.streamableSessions.delete(activeSessionId);
              // Don't call server.close() here - it creates a circular dependency.
              // The server will be garbage collected when removed from the map.
              // The transport's close event indicates the connection is already closed.
            }
          };

          await server.connect(transport);
          session = { transport, server };
        }
      }
    }

    if (!session) {
      this.sendJsonError(res, 400, 'Bad Request: No valid session ID provided');
      return;
    }

    log(`Handling request with session ${sessionId || 'new'}, method: ${req.method}`);
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    let responseSize = 0;

    res.write = function(chunk?: unknown, encoding?: unknown, callback?: unknown) {
      if (chunk) {
        responseSize += Buffer.isBuffer(chunk) ? chunk.length : String(chunk).length;
      }
      return originalWrite(chunk as any, encoding as any, callback as any);
    } as any;

    res.end = function(chunk?: unknown, encoding?: unknown, callback?: unknown) {
      log(`Response sent: status=${res.statusCode}, contentType=${res.getHeader('content-type')}, size=${responseSize} bytes`);
      return originalEnd(chunk as any, encoding as any, callback as any);
    } as any;

    await session.transport.handleRequest(req, res, parsedBody);
  }

  private async handleSse(req: IncomingMessage, res: ServerResponse): Promise<void> {
    log(`SSE ${req.method} request`, { url: req.url, headers: req.headers });
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/sse' && req.method === 'GET') {
      log('SSE connection request, creating new SSE session');
      const transport = new SSEServerTransport('/messages', res);
      const server = this.createServerInstance();
      log(`SSE session created: ${transport.sessionId}`);
      this.sseSessions.set(transport.sessionId, { transport, server });

      transport.onclose = () => {
        log(`SSE session closed: ${transport.sessionId}`);
        this.sseSessions.delete(transport.sessionId);
        // Don't call server.close() here - the session is already being cleaned up
      };

      await server.connect(transport);
      return;
    }

    if (url.pathname === '/messages' && req.method === 'POST') {
      const sessionId = url.searchParams.get('sessionId') ?? undefined;
      const session = sessionId ? this.sseSessions.get(sessionId) : undefined;
      log(`SSE POST /messages request for session: ${sessionId || 'unknown'}`);

      if (!session) {
        this.sendJsonError(res, 400, 'Bad Request: No valid session ID provided');
        return;
      }

      let parsedBody: unknown | undefined;
      try {
        parsedBody = await this.readJsonBody(req);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.sendJsonError(res, 400, `Parse error: ${errorMessage}`);
        return;
      }

      const originalEnd = res.end.bind(res);
      res.end = function(chunk?: unknown, encoding?: unknown, callback?: unknown) {
        log(`SSE POST response sent: status=${res.statusCode}`);
        return originalEnd(chunk as any, encoding as any, callback as any);
      } as any;

      await session.transport.handlePostMessage(req, res, parsedBody);
      return;
    }
  }

  async run(): Promise<void> {
    const transport = process.env.MCP_TRANSPORT?.toLowerCase() ?? 'http';

    if (transport === 'stdio') {
      await this.runStdio();
      return;
    }

    await this.runHttp();
  }

  private async runStdio(): Promise<void> {
    log('Starting STDIO transport mode');
    const server = this.createServerInstance();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Drafts MCP Server running on stdio');
    log('STDIO transport connected');
  }

  private async runHttp(): Promise<void> {
    const port = Number.parseInt(process.env.MCP_HTTP_PORT ?? '3000', 10);
    const host = process.env.MCP_HTTP_HOST ?? '127.0.0.1';
    const streamablePath = process.env.MCP_HTTP_PATH ?? '/mcp';
    this.useJsonResponse = process.env.MCP_JSON_RESPONSE === 'true' || process.argv.includes('--json-response');
    log('Starting HTTP transport mode', { host, port, streamablePath, useJsonResponse: this.useJsonResponse });

    this.httpServer = createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end('Missing request URL');
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
        if (url.pathname === streamablePath) {
          await this.handleStreamableHttp(req, res);
          return;
        }

        if (url.pathname === '/sse' || url.pathname === '/messages') {
          await this.handleSse(req, res);
          return;
        }

        res.statusCode = 404;
        res.end('Not found');
      } catch (error) {
        console.error('[MCP HTTP Error]', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal server error');
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.listen(port, host, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    log(`HTTP server started on ${host}:${port}`);
    const modeInfo = this.useJsonResponse ? '(JSON responses for clients like LM Studio)' : '(SSE streaming)';
    console.error(
      `Drafts MCP Server listening on http://${host}:${port}${streamablePath} (Streamable HTTP ${modeInfo}) and /sse + /messages (SSE fallback)`
    );
  }
}

// Environment variable to switch transports:
// - MCP_TRANSPORT=stdio (for STDIO mode, default for Claude Desktop)
// - MCP_TRANSPORT=http (for HTTP modes, default)

// Start the server
const server = new DraftsMCPServer();
server.run().catch(console.error);
