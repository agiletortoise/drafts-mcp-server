import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDraftProperties, parseDraftsList } from '../dist/drafts.js';

function encode(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('<<SEP>>', '\\S')
    .replaceAll('<<END>>', '\\E');
}

function buildDraft(fields) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}:${encode(value)}`)
    .join('<<SEP>>');
}

test('parseDraftProperties decodes values containing legacy delimiters', () => {
  const content = 'idea one <<SEP>> fake field <<END>> next draft';
  const serialized = buildDraft({
    ID: 'abc-123',
    TITLE: 'Title with <<SEP>> marker',
    CONTENT: content,
    FLAGGED: 'true',
    FOLDER: 'inbox',
    TAGS: 'ideas, dictation',
    TAG_NAMES: '#ideas#,#dictation#',
    QUERY_TAG_NAMES: '#ideas##dictation#',
    CREATED: '2026-03-20T10:00:00Z',
    MODIFIED: '2026-03-20T10:05:00Z',
    ACCESSED: '2026-03-20T10:06:00Z',
    PERMALINK: 'drafts://open?uuid=abc-123',
    CREATION_LAT: '0',
    CREATION_LON: '0',
    MODIFICATION_LAT: '1.5',
    MODIFICATION_LON: '-2.5',
  });

  const draft = parseDraftProperties(serialized);

  assert.equal(draft.id, 'abc-123');
  assert.equal(draft.title, 'Title with <<SEP>> marker');
  assert.equal(draft.content, content);
  assert.equal(draft.flagged, true);
  assert.deepEqual(draft.tags, ['ideas', 'dictation']);
  assert.equal(draft.modificationLatitude, 1.5);
  assert.equal(draft.modificationLongitude, -2.5);
});

test('parseDraftsList keeps multiple drafts intact when content includes separators', () => {
  const first = buildDraft({
    ID: 'one',
    TITLE: 'First',
    CONTENT: 'dictated content <<END>> still same draft',
    FLAGGED: 'false',
    FOLDER: 'archive',
    TAGS: '',
    TAG_NAMES: '',
    QUERY_TAG_NAMES: '',
    CREATED: '2026-03-20T10:00:00Z',
    MODIFIED: '2026-03-20T10:00:00Z',
    ACCESSED: '2026-03-20T10:00:00Z',
    PERMALINK: '',
    CREATION_LAT: '0',
    CREATION_LON: '0',
    MODIFICATION_LAT: '0',
    MODIFICATION_LON: '0',
  });
  const second = buildDraft({
    ID: 'two',
    TITLE: 'Second',
    CONTENT: 'plain content',
    FLAGGED: 'true',
    FOLDER: 'trash',
    TAGS: 'x',
    TAG_NAMES: '#x#',
    QUERY_TAG_NAMES: '#x#',
    CREATED: '2026-03-20T11:00:00Z',
    MODIFIED: '2026-03-20T11:00:00Z',
    ACCESSED: '2026-03-20T11:00:00Z',
    PERMALINK: '',
    CREATION_LAT: '0',
    CREATION_LON: '0',
    MODIFICATION_LAT: '0',
    MODIFICATION_LON: '0',
  });

  const drafts = parseDraftsList(`${first}<<END>>${second}<<END>>`);

  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].content, 'dictated content <<END>> still same draft');
  assert.equal(drafts[1].id, 'two');
  assert.equal(drafts[1].flagged, true);
});
