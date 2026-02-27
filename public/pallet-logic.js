/**
 * Pure palette/linter logic for use in app and tests.
 * Single source of truth: applyPalletStep(state, row) is the actual logic used by the UI.
 * In browser: attach to window.palletLogic. In Node: module.exports.
 */

function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < csvText.length) {
    const c = csvText[i];
    if (inQuotes) {
      if (c === '"') {
        if (csvText[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      row.push(field);
      field = '';
      if (c === '\r' && csvText[i + 1] === '\n') i++;
      i++;
      rows.push(row);
      row = [];
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function parseCSV(csvText) {
  const rawRows = parseCSVRows(csvText);
  if (!rawRows.length) return [];
  const header = rawRows[0].map((s) => s.trim());
  const rows = [];
  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i];
    if (values.every((v) => !v.trim())) continue;
    const row = {};
    header.forEach((h, j) => { row[h] = values[j] != null ? values[j].trim() : ''; });
    rows.push(row);
  }
  return rows;
}

function lintLeadingSpaces(code) {
  const lines = code.split('\n');
  const depths = [];
  let depth = 0;
  let inString = null;
  for (const line of lines) {
    depths.push(depth);
    for (const c of line) {
      if (inString) {
        if (c === inString) inString = null;
        continue;
      }
      if (c === '"' || c === "'") inString = c;
      else if (c === '(') depth++;
      else if (c === ')') depth = Math.max(0, depth - 1);
    }
  }
  const result = [];
  let prevIndent = 0;
  for (let j = 0; j < lines.length; j++) {
    const trimmed = lines[j].trimStart();
    const isClosingParen = trimmed === ')' || trimmed.startsWith('),');
    const indent = isClosingParen
      ? 2 * Math.max(0, depths[j] - 1)
      : trimmed.startsWith('.')
        ? prevIndent + 2
        : 2 * depths[j];
    const spaces = Math.max(0, indent);
    result.push(' '.repeat(spaces) + trimmed);
    if (!trimmed.startsWith('.')) prevIndent = spaces;
  }
  return result.join('\n');
}

function needsLeadingComma(beforeCursor) {
  const before = (beforeCursor || '').trimEnd();
  if (!before.length) return false;
  if (before.endsWith(',')) return false;
  if (/\(\s*$/.test(before)) return false;
  return true;
}

function buildWrapInsert(template, insertPosition, selectedText) {
  const content = selectedText.trim()
    ? selectedText.split('\n').map((line) => '  ' + line).join('\n')
    : '';
  const pos = Math.max(0, Math.min(insertPosition, template.length));
  return template.slice(0, pos) + content + template.slice(pos);
}

function cursorAfterLint(oldCode, oldPos, lintedCode, offsetFromEnd) {
  const oldLines = oldCode.split('\n');
  let pos = 0;
  let lineNum = 0;
  for (let i = 0; i < oldLines.length; i++) {
    const lineLen = oldLines[i].length + 1;
    if (pos + lineLen > oldPos) {
      lineNum = i;
      break;
    }
    pos += lineLen;
  }
  const newLines = lintedCode.split('\n');
  let newPos = 0;
  for (let i = 0; i < lineNum && i < newLines.length; i++) newPos += newLines[i].length + 1;
  const line = newLines[lineNum];
  if (line != null) newPos += Math.max(0, line.length - (offsetFromEnd || 0));
  return newPos;
}

function isPreludeLine(line) {
  const t = line.trim();
  return !t || /^(const|let|import)\s/.test(t);
}

function findFirstPatternOffset(doc) {
  const lines = doc.split('\n');
  let offset = 0;
  for (const line of lines) {
    if (!isPreludeLine(line)) return offset;
    offset += line.length + 1;
  }
  return offset;
}

/**
 * Apply one palette row to the editor state. This is the actual logic used by the UI.
 * @param {{ code: string, cursor: number, from?: number, to?: number }} state - current code, cursor, and optional selection
 * @param {{ code?: string, imports?: string, consts?: string, insertIndex?: string, cursorEndOfLineOffset?: string }} row - palette row (from CSV)
 * @returns {{ code: string, cursor: number }} new state
 */
function applyPalletStep(state, row) {
  let { code, cursor } = state;
  const from = state.from ?? state.cursor;
  const to = state.to ?? state.cursor;
  const insertIndex = row.insertIndex != null && row.insertIndex !== '' ? parseInt(row.insertIndex, 10) : 0;
  const cursorEndOfLineOffset = row.cursorEndOfLineOffset != null && row.cursorEndOfLineOffset !== '' ? parseInt(row.cursorEndOfLineOffset, 10) : 0;
  const rowCode = (row.code || '').trim();
  const imports = (row.imports || '').trim();
  const consts = (row.consts || '').trim();

  // 1. Ensure imports at top
  if (imports && !code.includes(imports)) {
    const insert = imports + (code.length && !code.startsWith('\n') ? '\n\n' : '\n');
    code = insert + code;
    cursor += insert.length;
  }

  // 2. Ensure consts after imports, before first pattern
  if (consts && !code.includes(consts)) {
    const insertAt = findFirstPatternOffset(code);
    const needLeadingNewline = insertAt > 0 && code.length >= insertAt && code[insertAt - 1] !== '\n';
    const insert = (needLeadingNewline ? '\n' : '') + consts + '\n';
    code = code.slice(0, insertAt) + insert + code.slice(insertAt);
    if (cursor <= insertAt) cursor = insertAt + insert.length;
    else cursor += insert.length;
  }

  // 3. Insert or wrap
  if (insertIndex > 0) {
    const template = rowCode || 'stack(\n  \n)';
    const selected = code.slice(from, to);
    const content = selected.trim() ? selected.split('\n').map((l) => '  ' + l).join('\n') : '';
    const pos = Math.max(0, Math.min(insertIndex, template.length));
    const insert = template.slice(0, pos) + content + template.slice(pos);
    code = code.slice(0, from) + insert + code.slice(to);
    const endPos = from + insert.length;
    const offset = Math.max(0, cursorEndOfLineOffset || 0);
    cursor = content === '' ? from + pos : endPos - offset;
    const beforeLint = code;
    code = lintLeadingSpaces(code);
    cursor = cursorAfterLint(beforeLint, cursor, code, content === '' ? 0 : cursorEndOfLineOffset);
  } else {
    const before = code.slice(0, cursor);
    const snippet = rowCode;
    const lastLine = before.trim().split('\n').pop() || '';
    const afterPrelude = !before.trim() || isPreludeLine(lastLine);
    const insert = needsLeadingComma(before) && !afterPrelude ? ',\n  ' + snippet : snippet;
    code = code.slice(0, cursor) + insert + code.slice(cursor);
    cursor += insert.length;
    const beforeLint = code;
    code = lintLeadingSpaces(code);
    cursor = cursorAfterLint(beforeLint, cursor, code, cursorEndOfLineOffset);
  }

  return { code, cursor };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSV,
    parseCSVRows,
    lintLeadingSpaces,
    needsLeadingComma,
    buildWrapInsert,
    cursorAfterLint,
    isPreludeLine,
    findFirstPatternOffset,
    applyPalletStep,
  };
} else {
  window.palletLogic = {
    parseCSV,
    parseCSVRows,
    lintLeadingSpaces,
    needsLeadingComma,
    buildWrapInsert,
    cursorAfterLint,
    isPreludeLine,
    findFirstPatternOffset,
    applyPalletStep,
  };
}
