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
  /** Comma-separated string of tag names */
  tagNames: string;
  /** Query tag names string */
  queryTagNames: string;
  /** ISO 8601 date string */
  creationDate: string;
  /** ISO 8601 date string */
  modificationDate: string;
  /** ISO 8601 date string */
  accessDate: string;
  permalink: string;
  creationLatitude: number;
  creationLongitude: number;
  modificationLatitude: number;
  modificationLongitude: number;
}

export interface Action {
  name: string;
  uuid?: string;
}

export interface Tag {
  name: string;
  drafts?: Draft[];
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
    ${formatDateToISOScript}
    tell application "Drafts"
      try
        set theDraft to current draft
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
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
    ${formatDateToISOScript}
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
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
        set results to results & props & "<<END>>"
      end repeat

      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  return parseDraftsList(result);
}

/**
 * AppleScript helper function to format a date as ISO 8601 (locale-independent)
 */
const formatDateToISOScript = `
on formatDateToISO(theDate)
  set y to year of theDate
  set m to month of theDate as integer
  set d to day of theDate
  set h to hours of theDate
  set min to minutes of theDate
  set s to seconds of theDate

  set mStr to text -2 thru -1 of ("0" & m)
  set dStr to text -2 thru -1 of ("0" & d)
  set hStr to text -2 thru -1 of ("0" & h)
  set minStr to text -2 thru -1 of ("0" & min)
  set sStr to text -2 thru -1 of ("0" & s)

  return (y as string) & "-" & mStr & "-" & dStr & "T" & hStr & ":" & minStr & ":" & sStr & "Z"
end formatDateToISO
`;

/**
 * Generate AppleScript code to create a date from ISO string (locale-independent)
 * Returns AppleScript code that constructs a date object programmatically
 */
function isoDateToAppleScriptDate(isoDate: string, varName: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `set ${varName} to current date
set year of ${varName} to ${year}
set month of ${varName} to ${month}
set day of ${varName} to ${day}
set hours of ${varName} to 0
set minutes of ${varName} to 0
set seconds of ${varName} to 0`;
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
    conditions.push(`query tag names contains "#${escapedTag}#"`);
  }

  if (filter.flagged !== undefined) {
    conditions.push(`flagged is ${filter.flagged}`);
  }

  if (filter.createdAfter) {
    dateSetup.push(isoDateToAppleScriptDate(filter.createdAfter, 'createdAfterDate'));
    conditions.push(`creation date > createdAfterDate`);
  }

  if (filter.createdBefore) {
    dateSetup.push(isoDateToAppleScriptDate(filter.createdBefore, 'createdBeforeDate'));
    conditions.push(`creation date < createdBeforeDate`);
  }

  if (filter.modifiedAfter) {
    dateSetup.push(isoDateToAppleScriptDate(filter.modifiedAfter, 'modifiedAfterDate'));
    conditions.push(`modification date > modifiedAfterDate`);
  }

  if (filter.modifiedBefore) {
    dateSetup.push(isoDateToAppleScriptDate(filter.modifiedBefore, 'modifiedBeforeDate'));
    conditions.push(`modification date < modifiedBeforeDate`);
  }

  const whereClause = conditions.length > 0
    ? `whose ${conditions.join(' and ')}`
    : '';

  const script = `
    ${formatDateToISOScript}
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
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
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
      ${tags && tags.length > 0 ? `set tag list of newDraft to ${tagList}` : ''}
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
    ${formatDateToISOScript}
    tell application "Drafts"
      try
        set theDraft to draft id "${escapedUuid}"
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
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
        set currentTags to tag list of targetDraft
        set tag list of targetDraft to currentTags & ${tagList}
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
 * List all tags
 */
export async function listTags(): Promise<Tag[]> {
  const script = `
    tell application "Drafts"
      set tagList to {}
      repeat with t in tags
        set end of tagList to name of t
      end repeat
      return tagList
    end tell
  `;

  const result = await executeAppleScript(script);
  const names = parseAppleScriptList(result);

  return names.map(name => ({ name }));
}

/**
 * Get a tag with its drafts
 */
export async function getTag(tagName: string): Promise<Tag> {
  const escapedTagName = escapeAppleScriptString(tagName);

  const script = `
    ${formatDateToISOScript}
    tell application "Drafts"
      set t to tag "${escapedTagName}"
      set draftList to drafts of t
      set results to ""
      repeat with d in draftList
        set theDraft to contents of d
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
        set results to results & props & "<<END>>"
      end repeat
      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  const drafts = parseDraftsList(result);

  return { name: tagName, drafts };
}

/**
 * Search for drafts
 */
export async function searchDrafts(query: string): Promise<Draft[]> {
  const escapedQuery = escapeAppleScriptString(query);

  const script = `
    ${formatDateToISOScript}
    tell application "Drafts"
      set searchResults to every draft whose content contains "${escapedQuery}"
      set results to ""
      repeat with d in searchResults
        set theDraft to contents of d
        set props to "ID:" & id of theDraft
        set props to props & "<<SEP>>TITLE:" & title of theDraft
        set props to props & "<<SEP>>CONTENT:" & content of theDraft
        set props to props & "<<SEP>>FLAGGED:" & flagged of theDraft
        set props to props & "<<SEP>>FOLDER:" & folder of theDraft
        set props to props & "<<SEP>>TAGS:" & ((tag list of theDraft) as string)
        set props to props & "<<SEP>>TAG_NAMES:" & tag names of theDraft
        set props to props & "<<SEP>>QUERY_TAG_NAMES:" & query tag names of theDraft
        set props to props & "<<SEP>>CREATED:" & my formatDateToISO(creation date of theDraft)
        set props to props & "<<SEP>>MODIFIED:" & my formatDateToISO(modification date of theDraft)
        set props to props & "<<SEP>>ACCESSED:" & my formatDateToISO(access date of theDraft)
        set props to props & "<<SEP>>PERMALINK:" & permalink of theDraft
        set props to props & "<<SEP>>CREATION_LAT:" & creation latitude of theDraft
        set props to props & "<<SEP>>CREATION_LON:" & creation longitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LAT:" & modification latitude of theDraft
        set props to props & "<<SEP>>MODIFICATION_LON:" & modification longitude of theDraft
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
 * Parse date string from AppleScript (already in ISO 8601 format from formatDateToISO)
 */
function parseAppleScriptDate(dateStr: string): string {
  // Dates are now returned in ISO format from AppleScript: "2025-11-10T07:56:32Z"
  return dateStr;
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
    tagNames: props['TAG_NAMES'] || '',
    queryTagNames: props['QUERY_TAG_NAMES'] || '',
    creationDate: props['CREATED'] ? parseAppleScriptDate(props['CREATED']) : '',
    modificationDate: props['MODIFIED'] ? parseAppleScriptDate(props['MODIFIED']) : '',
    accessDate: props['ACCESSED'] ? parseAppleScriptDate(props['ACCESSED']) : '',
    permalink: props['PERMALINK'] || '',
    creationLatitude: parseFloat(props['CREATION_LAT']) || 0,
    creationLongitude: parseFloat(props['CREATION_LON']) || 0,
    modificationLatitude: parseFloat(props['MODIFICATION_LAT']) || 0,
    modificationLongitude: parseFloat(props['MODIFICATION_LON']) || 0,
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
