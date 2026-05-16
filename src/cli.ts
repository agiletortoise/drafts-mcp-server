#!/usr/bin/env node

import { Command } from 'commander';
import * as drafts from './drafts.js';

const program = new Command();

program
  .name('drafts')
  .description('CLI for interacting with the macOS Drafts app')
  .version('1.0.12')
  .option('--json', 'Output raw JSON instead of formatted tables');

// --- Formatting helpers ---

function isJson(): boolean {
  // Check the root-level --json flag
  return program.opts().json === true;
}

function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

function shortDate(iso: string): string {
  if (!iso) return '';
  return iso.replace('T', ' ').replace('Z', '');
}

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const sep = widths.map(w => '\u2500'.repeat(w + 2)).join('\u253c');
  const headerLine = headers.map((h, i) => ' ' + padRight(h, widths[i]) + ' ').join('\u2502');
  const dataLines = rows.map(row =>
    row.map((cell, i) => ' ' + padRight(cell || '', widths[i]) + ' ').join('\u2502')
  );
  return [headerLine, sep, ...dataLines].join('\n');
}

function formatDraftRow(d: drafts.DraftSummary): string[] {
  return [
    d.id,
    truncate(d.title || '(untitled)', 40),
    d.folder,
    d.flagged ? '\u2691' : '',
    truncate(d.tags.join(', '), 30),
    shortDate(d.modificationDate),
  ];
}

function formatDraftTable(list: drafts.DraftSummary[]): string {
  if (list.length === 0) return 'No drafts found.';
  const headers = ['ID', 'Title', 'Folder', 'Flag', 'Tags', 'Modified'];
  const rows = list.map(formatDraftRow);
  return table(headers, rows);
}

function formatDraftDetail(d: drafts.Draft): string {
  const lines = [
    `       ID: ${d.id}`,
    `    Title: ${d.title || '(untitled)'}`,
    `   Folder: ${d.folder}`,
    `  Flagged: ${d.flagged ? 'yes' : 'no'}`,
    `     Tags: ${d.tags.length > 0 ? d.tags.join(', ') : '(none)'}`,
    `  Created: ${shortDate(d.creationDate)}`,
    ` Modified: ${shortDate(d.modificationDate)}`,
    ` Accessed: ${shortDate(d.accessDate)}`,
    `Permalink: ${d.permalink}`,
    '',
    d.content,
  ];
  return lines.join('\n');
}

function formatNameList(items: { name: string }[]): string {
  if (items.length === 0) return '(none)';
  return items.map(i => i.name).join('\n');
}

// --- Workspaces ---

const workspace = program.command('workspace').description('Workspace commands');

workspace
  .command('list')
  .description('List all workspaces')
  .action(async () => {
    const result = await drafts.listWorkspaces();
    if (isJson()) return output(result);
    console.log(formatNameList(result));
  });

workspace
  .command('current')
  .description('Get the current workspace')
  .action(async () => {
    const result = await drafts.getCurrentWorkspace();
    if (isJson()) return output(result);
    console.log(result.name);
  });

workspace
  .command('open <name>')
  .description('Open a workspace by name')
  .action(async (name: string) => {
    const success = await drafts.openWorkspace(name);
    if (!success) fail(`Failed to open workspace "${name}"`);
    console.log(`Opened workspace "${name}"`);
  });

workspace
  .command('drafts <name>')
  .description('Get drafts from a workspace')
  .option('--folder <folder>', 'Filter by folder (inbox, archive, trash)')
  .action(async (name: string, opts: { folder?: string }) => {
    const folder = opts.folder as 'inbox' | 'archive' | 'trash' | undefined;
    const result = await drafts.getWorkspaceDrafts(name, folder);
    if (isJson()) return output(result);
    console.log(formatDraftTable(result));
  });

// --- Tags ---

const tag = program.command('tag').description('Tag commands');

tag
  .command('list')
  .description('List all tags')
  .action(async () => {
    const result = await drafts.listTags();
    if (isJson()) return output(result);
    console.log(formatNameList(result));
  });

tag
  .command('get <name>')
  .description('Get a tag and its associated drafts')
  .action(async (name: string) => {
    const result = await drafts.getTag(name);
    if (isJson()) return output(result);
    console.log(`Tag: ${result.name}\n`);
    console.log(formatDraftTable(result.drafts || []));
  });

// --- Drafts ---

program
  .command('list')
  .description('List drafts with optional filters')
  .option('--query <text>', 'Filter by content')
  .option('--folder <folder>', 'Filter by folder (inbox, archive, trash)')
  .option('--tag <tag>', 'Filter by tag')
  .option('--flagged', 'Only flagged drafts')
  .option('--created-after <date>', 'Created after date (YYYY-MM-DD)')
  .option('--created-before <date>', 'Created before date (YYYY-MM-DD)')
  .option('--modified-after <date>', 'Modified after date (YYYY-MM-DD)')
  .option('--modified-before <date>', 'Modified before date (YYYY-MM-DD)')
  .action(async (opts: Record<string, string | boolean | undefined>) => {
    const filter: drafts.DraftFilter = {};
    if (opts.query) filter.query = opts.query as string;
    if (opts.folder) filter.folder = opts.folder as 'inbox' | 'archive' | 'trash';
    if (opts.tag) filter.tag = opts.tag as string;
    if (opts.flagged) filter.flagged = true;
    if (opts.createdAfter) filter.createdAfter = opts.createdAfter as string;
    if (opts.createdBefore) filter.createdBefore = opts.createdBefore as string;
    if (opts.modifiedAfter) filter.modifiedAfter = opts.modifiedAfter as string;
    if (opts.modifiedBefore) filter.modifiedBefore = opts.modifiedBefore as string;
    const result = await drafts.getDrafts(filter);
    if (isJson()) return output(result);
    console.log(formatDraftTable(result));
  });

program
  .command('get <uuid>')
  .description('Get a draft by UUID')
  .action(async (uuid: string) => {
    const draft = await drafts.getDraft(uuid);
    if (!draft) fail(`Draft not found: ${uuid}`);
    if (isJson()) return output(draft);
    console.log(formatDraftDetail(draft));
  });

program
  .command('current')
  .description('Get the current draft open in Drafts')
  .action(async () => {
    const draft = await drafts.getCurrentDraft();
    if (!draft) fail('No current draft');
    if (isJson()) return output(draft);
    console.log(formatDraftDetail(draft));
  });

program
  .command('create <content>')
  .description('Create a new draft')
  .option('--tag <tags...>', 'Tags to add')
  .option('--flagged', 'Flag the draft')
  .action(async (content: string, opts: { tag?: string[]; flagged?: boolean }) => {
    const uuid = await drafts.createDraft(content, opts.tag, opts.flagged);
    console.log(uuid);
  });

program
  .command('update <uuid> <content>')
  .description('Update a draft\'s content')
  .action(async (uuid: string, content: string) => {
    const success = await drafts.updateDraft(uuid, content);
    if (!success) fail(`Failed to update draft ${uuid}`);
    console.log(`Updated draft ${uuid}`);
  });

program
  .command('open <uuid>')
  .description('Open a draft in the Drafts editor')
  .action(async (uuid: string) => {
    const success = await drafts.openDraft(uuid);
    if (!success) fail(`Failed to open draft ${uuid}`);
    console.log(`Opened draft ${uuid}`);
  });

program
  .command('archive <uuid>')
  .description('Archive a draft')
  .action(async (uuid: string) => {
    const success = await drafts.archiveDraft(uuid);
    if (!success) fail(`Failed to archive draft ${uuid}`);
    console.log(`Archived draft ${uuid}`);
  });

program
  .command('inbox <uuid>')
  .description('Move a draft to inbox')
  .action(async (uuid: string) => {
    const success = await drafts.inboxDraft(uuid);
    if (!success) fail(`Failed to move draft ${uuid} to inbox`);
    console.log(`Moved draft ${uuid} to inbox`);
  });

program
  .command('trash <uuid>')
  .description('Move a draft to trash')
  .action(async (uuid: string) => {
    const success = await drafts.trashDraft(uuid);
    if (!success) fail(`Failed to trash draft ${uuid}`);
    console.log(`Trashed draft ${uuid}`);
  });

program
  .command('flag <uuid>')
  .description('Flag or unflag a draft')
  .option('--unflag', 'Unflag instead of flag')
  .action(async (uuid: string, opts: { unflag?: boolean }) => {
    const flagged = !opts.unflag;
    const success = await drafts.setDraftFlagged(uuid, flagged);
    if (!success) fail(`Failed to ${flagged ? 'flag' : 'unflag'} draft ${uuid}`);
    console.log(`${flagged ? 'Flagged' : 'Unflagged'} draft ${uuid}`);
  });

program
  .command('add-tags <uuid> <tags...>')
  .description('Add tags to a draft')
  .action(async (uuid: string, tags: string[]) => {
    const success = await drafts.addTagsToDraft(uuid, tags);
    if (!success) fail(`Failed to add tags to draft ${uuid}`);
    console.log(`Added tags to draft ${uuid}`);
  });

program
  .command('remove-tags <uuid> <tags...>')
  .description('Remove tags from a draft')
  .action(async (uuid: string, tags: string[]) => {
    const success = await drafts.removeTagsFromDraft(uuid, tags);
    if (!success) fail(`Failed to remove tags from draft ${uuid}`);
    console.log(`Removed tags from draft ${uuid}`);
  });

program
  .command('search <query>')
  .description('Search drafts by content')
  .action(async (query: string) => {
    const result = await drafts.searchDrafts(query);
    if (isJson()) return output(result);
    console.log(formatDraftTable(result));
  });

// --- Actions ---

const action = program.command('action').description('Action commands');

action
  .command('list')
  .description('List all available actions')
  .action(async () => {
    const result = await drafts.listActions();
    if (isJson()) return output(result);
    console.log(formatNameList(result));
  });

action
  .command('run <draft-uuid> <action-name>')
  .description('Run an action on a draft')
  .action(async (draftUuid: string, actionName: string) => {
    const success = await drafts.runAction(draftUuid, actionName);
    if (!success) fail(`Failed to run action "${actionName}" on draft ${draftUuid}`);
    console.log(`Ran action "${actionName}" on draft ${draftUuid}`);
  });

program.parse();
