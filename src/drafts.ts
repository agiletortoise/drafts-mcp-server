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

const fieldSeparator = '<<SEP>>';
const draftSeparator = '<<END>>';

/**
 * Shared AppleScript helpers for ISO dates and safe field serialization.
 */
const applescriptHelpers = `
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

on replaceText(findText, replaceText, sourceText)
  set savedDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to findText
  set textItems to every text item of sourceText
  set AppleScript's text item delimiters to replaceText
  set replacedText to textItems as text
  set AppleScript's text item delimiters to savedDelimiters
  return replacedText
end replaceText

on escapeFieldValue(theValue)
  set escapedValue to my replaceText("\\", "\\\\", theValue as text)
  set escapedValue to my replaceText("${fieldSeparator}", "\\S", escapedValue)
  set escapedValue to my replaceText("${draftSeparator}", "\\E", escapedValue)
  return escapedValue
end escapeFieldValue

on appendEncodedField(existingProps, fieldName, fieldValue)
  return existingProps & "${fieldSeparator}" & fieldName & ":" & my escapeFieldValue(fieldValue)
end appendEncodedField

on serializeDraft(theDraft)
  set props to "ID:" & my escapeFieldValue(id of theDraft)
  set props to my appendEncodedField(props, "TITLE", title of theDraft)
  set props to my appendEncodedField(props, "CONTENT", content of theDraft)
  set props to my appendEncodedField(props, "FLAGGED", flagged of theDraft)
  set props to my appendEncodedField(props, "FOLDER", folder of theDraft)
  set props to my appendEncodedField(props, "TAGS", (tag list of theDraft) as string)
  set props to my appendEncodedField(props, "TAG_NAMES", tag names of theDraft)
  set props to my appendEncodedField(props, "QUERY_TAG_NAMES", query tag names of theDraft)
  set props to my appendEncodedField(props, "CREATED", my formatDateToISO(creation date of theDraft))
  set props to my appendEncodedField(props, "MODIFIED", my formatDateToISO(modification date of theDraft))
  set props to my appendEncodedField(props, "ACCESSED", my formatDateToISO(access date of theDraft))
  set props to my appendEncodedField(props, "PERMALINK", permalink of theDraft)
  set props to my appendEncodedField(props, "CREATION_LAT", creation latitude of theDraft)
  set props to my appendEncodedField(props, "CREATION_LON", creation longitude of theDraft)
  set props to my appendEncodedField(props, "MODIFICATION_LAT", modification latitude of theDraft)
  set props to my appendEncodedField(props, "MODIFICATION_LON", modification longitude of theDraft)
  return props
end serializeDraft
`;

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
    ${applescriptHelpers}
    tell application "Drafts"
      try
        set theDraft to current draft
        return my serializeDraft(theDraft)
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
    ${applescriptHelpers}
    tell application "Drafts"
      set targetWorkspace to workspace "${escapedWorkspace}"

      ${folder
        ? `set matchingDrafts to every draft of targetWorkspace whose folder is ${folder}`
        : `set matchingDrafts to every draft of targetWorkspace`
      }

      set results to ""
      repeat with d in matchingDrafts
        set theDraft to contents of d
        set results to results & my serializeDraft(theDraft) & "${draftSeparator}"
      end repeat

      return results
    end tell
  `;

  const result = await executeAppleScript(script);
  return parseDraftsList(result);
}

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
    ${applescriptHelpers}
    tell application "Drafts"
      ${dateSetup.join('\n      ')}
      set matchingDrafts to every draft ${whereClause}

      set results to ""
      repeat with d in matchingDrafts
        set theDraft to contents of d
        set results to results & my serializeDraft(theDraft) & "${draftSeparator}"
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
    ${applescriptHelpers}
    tell application "Drafts"
      try
        set theDraft to draft id "${escapedUuid}"
        return my serializeDraft(theDraft)
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
    ${applescriptHelpers}
    tell application "Drafts"
      set t to tag "${escapedTagName}"
      set draftList to drafts of t
      set results to ""
      repeat with d in draftList
        set theDraft to contents of d
        set results to results & my serializeDraft(theDraft) & "${draftSeparator}"
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
    ${applescriptHelpers}
    tell application "Drafts"
      set searchResults to every draft whose content contains "${escapedQuery}"
      set results to ""
      repeat with d in searchResults
        set theDraft to contents of d
        set results to results & my serializeDraft(theDraft) & "${draftSeparator}"
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

/**
 * Open a workspace by name in Drafts
 */
export async function openWorkspace(name: string): Promise<boolean> {
  const escapedName = escapeAppleScriptString(name);

  const script = `
    tell application "Drafts"
      try
        activate
        open workspace "${escapedName}"
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
  return dateStr;
}

function decodeFieldValue(value: string): string {
  let decoded = '';

  for (let i = 0; i < value.length; i += 1) {
    const current = value[i];

    if (current !== '\\') {
      decoded += current;
      continue;
    }

    const next = value[i + 1];

    if (next === '\\') {
      decoded += '\\';
      i += 1;
    } else if (next === 'S') {
      decoded += fieldSeparator;
      i += 1;
    } else if (next === 'E') {
      decoded += draftSeparator;
      i += 1;
    } else {
      decoded += current;
    }
  }

  return decoded;
}

export function parseDraftProperties(propsStr: string): Draft {
  const props: Record<string, string> = {};
  const parts = propsStr.split(fieldSeparator);

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const key = part.substring(0, colonIdx);
      const value = part.substring(colonIdx + 1);
      props[key] = decodeFieldValue(value);
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

export function parseDraftsList(output: string): Draft[] {
  const drafts: Draft[] = [];

  if (!output || output.trim() === '') {
    return drafts;
  }

  const entries = output.split(draftSeparator).filter(e => e.trim() !== '');

  for (const entry of entries) {
    drafts.push(parseDraftProperties(entry));
  }

  return drafts;
}

export function parseSingleDraft(output: string): Draft {
  return parseDraftProperties(output);
}
