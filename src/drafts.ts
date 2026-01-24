import { executeAppleScript, escapeAppleScriptString, parseAppleScriptList } from './applescript.js';

export interface Workspace {
  name: string;
  uuid?: string;
}

export interface Draft {
  id: string;
  title: string;
  content: string;
  flagged: boolean;
  folder: 'inbox' | 'archive' | 'trash';
  tags: string[];
  /** ISO 8601 date string */
  createdAt: string;
  /** ISO 8601 date string */
  modifiedAt: string;
  /** ISO 8601 date string */
  accessedAt: string;
  permalink: string;
}

export interface Action {
  name: string;
  uuid?: string;
}

export interface DraftFilter {
  query?: string;
  folder?: 'inbox' | 'archive' | 'trash';
  tag?: string;
  flagged?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

/**
 * List all workspaces in Drafts
 */
export async function listWorkspaces(): Promise<Workspace[]> {
  const script = `
    tell application "Drafts"
      set workspaceList to {}
      repeat with w in workspaces
        set end of workspaceList to name of w
      end repeat
      return workspaceList
    end tell
  `;

  const result = await executeAppleScript(script);
  const names = parseAppleScriptList(result);

  return names.map(name => ({ name }));
}

/**
 * Get the current workspace
 */
export async function getCurrentWorkspace(): Promise<Workspace> {
  const script = `
    tell application "Drafts"
      set w to current workspace
      return name of w
    end tell
  `;

  const result = await executeAppleScript(script);
  return { name: result };
}

/**
 * Get the current draft
 */
export async function getCurrentDraft(): Promise<Draft | null> {
  const script = `
    tell application "Drafts"
      try
        set theDraft to current draft
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tags of theDraft) as string)
        set props to props & "<<SEP>>CREATED:" & ((createdAt of theDraft) as string)
        set props to props & "<<SEP>>MODIFIED:" & ((modifiedAt of theDraft) as string)
        set props to props & "<<SEP>>ACCESSED:" & ((accessedAt of theDraft) as string)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        return props
      on error errMsg
        return "NOT_FOUND:" & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);

  if (result.startsWith('NOT_FOUND:')) {
    return null;
  }

  return parseSingleDraft(result);
}

/**
 * Get drafts from a specific workspace
 */
export async function getWorkspaceDrafts(
  workspaceName: string,
  folder?: 'inbox' | 'archive' | 'trash'
): Promise<Draft[]> {
  const escapedWorkspace = escapeAppleScriptString(workspaceName);

  const script = `
    tell application "Drafts"
      set targetWorkspace to workspace "${escapedWorkspace}"

      ${folder
        ? `set matchingDrafts to every draft of targetWorkspace whose folder is ${folder}`
        : `set matchingDrafts to every draft of targetWorkspace`
      }

      set results to ""
      repeat with d in matchingDrafts
        set theDraft to contents of d
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tags of theDraft) as string)
        set props to props & "<<SEP>>CREATED:" & ((createdAt of theDraft) as string)
        set props to props & "<<SEP>>MODIFIED:" & ((modifiedAt of theDraft) as string)
        set props to props & "<<SEP>>ACCESSED:" & ((accessedAt of theDraft) as string)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set results to results & props & "<<END>>"
      end repeat

      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  return parseDraftsList(result);
}

/**
 * Convert ISO date string (YYYY-MM-DD) to AppleScript date format
 */
function toAppleScriptDate(isoDate: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${months[month - 1]} ${day}, ${year}`;
}

/**
 * Get drafts with flexible filtering
 */
export async function getDrafts(filter: DraftFilter): Promise<Draft[]> {
  const conditions: string[] = [];
  const dateSetup: string[] = [];

  if (filter.query) {
    const escapedQuery = escapeAppleScriptString(filter.query);
    conditions.push(`content contains "${escapedQuery}"`);
  }

  if (filter.folder) {
    conditions.push(`folder is ${filter.folder}`);
  }

  if (filter.tag) {
    const escapedTag = escapeAppleScriptString(filter.tag);
    conditions.push(`tags contains "${escapedTag}"`);
  }

  if (filter.flagged !== undefined) {
    conditions.push(`flagged is ${filter.flagged}`);
  }

  if (filter.createdAfter) {
    dateSetup.push(`set createdAfterDate to date "${toAppleScriptDate(filter.createdAfter)}"`);
    conditions.push(`createdAt > createdAfterDate`);
  }

  if (filter.createdBefore) {
    dateSetup.push(`set createdBeforeDate to date "${toAppleScriptDate(filter.createdBefore)}"`);
    conditions.push(`createdAt < createdBeforeDate`);
  }

  if (filter.modifiedAfter) {
    dateSetup.push(`set modifiedAfterDate to date "${toAppleScriptDate(filter.modifiedAfter)}"`);
    conditions.push(`modifiedAt > modifiedAfterDate`);
  }

  if (filter.modifiedBefore) {
    dateSetup.push(`set modifiedBeforeDate to date "${toAppleScriptDate(filter.modifiedBefore)}"`);
    conditions.push(`modifiedAt < modifiedBeforeDate`);
  }

  const whereClause = conditions.length > 0
    ? `whose ${conditions.join(' and ')}`
    : '';

  const script = `
    tell application "Drafts"
      ${dateSetup.join('\n      ')}
      set matchingDrafts to every draft ${whereClause}

      set results to ""
      repeat with d in matchingDrafts
        set theDraft to contents of d
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tags of theDraft) as string)
        set props to props & "<<SEP>>CREATED:" & ((createdAt of theDraft) as string)
        set props to props & "<<SEP>>MODIFIED:" & ((modifiedAt of theDraft) as string)
        set props to props & "<<SEP>>ACCESSED:" & ((accessedAt of theDraft) as string)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set results to results & props & "<<END>>"
      end repeat

      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  return parseDraftsList(result);
}

/**
 * Create a new draft
 */
export async function createDraft(
  content: string,
  tags?: string[],
  flagged?: boolean
): Promise<string> {
  const escapedContent = escapeAppleScriptString(content);
  const tagList = tags && tags.length > 0 
    ? `{${tags.map(t => `"${escapeAppleScriptString(t)}"`).join(', ')}}` 
    : '{}';

  const script = `
    tell application "Drafts"
      set newDraft to make new draft with properties {content:"${escapedContent}"}
      ${tags && tags.length > 0 ? `set tags of newDraft to ${tagList}` : ''}
      ${flagged ? `set flagged of newDraft to true` : ''}
      set theUUID to id of newDraft
      return theUUID
    end tell
  `;

  return await executeAppleScript(script);
}

/**
 * Get a specific draft by UUID
 */
export async function getDraft(uuid: string): Promise<Draft | null> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        set theDraft to draft id "${escapedUuid}"
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tags of theDraft) as string)
        set props to props & "<<SEP>>CREATED:" & ((createdAt of theDraft) as string)
        set props to props & "<<SEP>>MODIFIED:" & ((modifiedAt of theDraft) as string)
        set props to props & "<<SEP>>ACCESSED:" & ((accessedAt of theDraft) as string)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        return props
      on error errMsg
        return "NOT_FOUND:" & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);

  if (result.startsWith('NOT_FOUND:')) {
    console.error('getDraft error:', result);
    return null;
  }

  return parseSingleDraft(result);
}

/**
 * Update a draft's content
 */
export async function updateDraft(uuid: string, content: string): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);
  const escapedContent = escapeAppleScriptString(content);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set content of targetDraft to "${escapedContent}"
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Add tags to a draft
 */
export async function addTagsToDraft(uuid: string, tags: string[]): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);
  const tagList = `{${tags.map(t => `"${escapeAppleScriptString(t)}"`).join(', ')}}`;

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set currentTags to tags of targetDraft
        set tags of targetDraft to currentTags & ${tagList}
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Run an action on a draft
 */
export async function runAction(
  draftUuid: string,
  actionName: string
): Promise<boolean> {
  const escapedDraftUuid = escapeAppleScriptString(draftUuid);
  const escapedActionName = escapeAppleScriptString(actionName);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedDraftUuid}"
        set targetAction to action "${escapedActionName}"
        perform action targetAction on draft targetDraft
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * List available actions
 */
export async function listActions(): Promise<Action[]> {
  const script = `
    tell application "Drafts"
      set actionList to {}
      repeat with a in actions
        set end of actionList to name of a
      end repeat
      return actionList
    end tell
  `;

  const result = await executeAppleScript(script);
  const names = parseAppleScriptList(result);
  
  return names.map(name => ({ name }));
}

/**
 * Search for drafts
 */
export async function searchDrafts(query: string): Promise<Draft[]> {
  const escapedQuery = escapeAppleScriptString(query);

  const script = `
    tell application "Drafts"
      set searchResults to search for query "${escapedQuery}"
      set results to ""
      repeat with d in searchResults
        set theDraft to contents of d
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tags of theDraft) as string)
        set props to props & "<<SEP>>CREATED:" & ((createdAt of theDraft) as string)
        set props to props & "<<SEP>>MODIFIED:" & ((modifiedAt of theDraft) as string)
        set props to props & "<<SEP>>ACCESSED:" & ((accessedAt of theDraft) as string)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set results to results & props & "<<END>>"
      end repeat
      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  return parseDraftsList(result);
}

/**
 * Flag or unflag a draft
 */
export async function setDraftFlagged(uuid: string, flagged: boolean): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set flagged of targetDraft to ${flagged}
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Archive a draft
 */
export async function archiveDraft(uuid: string): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set folder of targetDraft to archive
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Move a draft to inbox
 */
export async function inboxDraft(uuid: string): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set folder of targetDraft to inbox
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Trash a draft
 */
export async function trashDraft(uuid: string): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        set targetDraft to draft id "${escapedUuid}"
        set folder of targetDraft to trash
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

/**
 * Open a draft in the Drafts editor
 */
export async function openDraft(uuid: string): Promise<boolean> {
  const escapedUuid = escapeAppleScriptString(uuid);

  const script = `
    tell application "Drafts"
      try
        activate
        set targetDraft to draft id "${escapedUuid}"
        open targetDraft
        return "SUCCESS"
      on error errMsg
        return "ERROR: " & errMsg
      end try
    end tell
  `;

  const result = await executeAppleScript(script);
  return result === 'SUCCESS';
}

// Helper functions for parsing AppleScript output

/**
 * Parse AppleScript date string to ISO 8601 format
 */
function parseAppleScriptDate(dateStr: string): string {
  // AppleScript format: "Monday, November 10, 2025 at 7:56:32 AM"
  const date = new Date(dateStr.replace(' at ', ' '));
  return date.toISOString();
}

function parseDraftProperties(propsStr: string): Draft {
  const props: Record<string, string> = {};
  const parts = propsStr.split('<<SEP>>');

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const key = part.substring(0, colonIdx);
      const value = part.substring(colonIdx + 1);
      props[key] = value;
    }
  }

  return {
    id: props['ID'] || '',
    title: props['TITLE'] || '',
    content: props['CONTENT'] || '',
    flagged: props['FLAGGED'] === 'true',
    folder: (props['FOLDER'] || 'inbox') as 'inbox' | 'archive' | 'trash',
    tags: props['TAGS'] ? props['TAGS'].split(', ').filter(t => t) : [],
    createdAt: props['CREATED'] ? parseAppleScriptDate(props['CREATED']) : '',
    modifiedAt: props['MODIFIED'] ? parseAppleScriptDate(props['MODIFIED']) : '',
    accessedAt: props['ACCESSED'] ? parseAppleScriptDate(props['ACCESSED']) : '',
    permalink: props['PERMALINK'] || '',
  };
}

function parseDraftsList(output: string): Draft[] {
  const drafts: Draft[] = [];

  if (!output || output.trim() === '') {
    return drafts;
  }

  const entries = output.split('<<END>>').filter(e => e.trim() !== '');

  for (const entry of entries) {
    drafts.push(parseDraftProperties(entry));
  }

  return drafts;
}

function parseSingleDraft(output: string): Draft {
  return parseDraftProperties(output);
}
