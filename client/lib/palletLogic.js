/**
 * Palette/linter logic for Strudel editor (applyPalletStep, lintLeadingSpaces).
 * Shared with server-side tests if needed.
 */

export function lintLeadingSpaces(code) {
  const lines = code.split('\n')
  const depths = []
  let depth = 0
  let inString = null
  for (const line of lines) {
    depths.push(depth)
    for (const c of line) {
      if (inString) {
        if (c === inString) inString = null
        continue
      }
      if (c === '"' || c === "'") inString = c
      else if (c === '(') depth++
      else if (c === ')') depth = Math.max(0, depth - 1)
    }
  }
  const result = []
  let prevIndent = 0
  for (let j = 0; j < lines.length; j++) {
    const trimmed = lines[j].trimStart()
    const isClosingParen = trimmed === ')' || trimmed.startsWith('),')
    const indent = isClosingParen
      ? 2 * Math.max(0, depths[j] - 1)
      : trimmed.startsWith('.')
        ? prevIndent + 2
        : 2 * depths[j]
    const spaces = Math.max(0, indent)
    result.push(' '.repeat(spaces) + trimmed)
    if (!trimmed.startsWith('.')) prevIndent = spaces
  }
  return result.join('\n')
}

function needsLeadingComma(beforeCursor) {
  const before = (beforeCursor || '').trimEnd()
  if (!before.length) return false
  if (before.endsWith(',')) return false
  if (/\(\s*$/.test(before)) return false
  return true
}

function cursorAfterLint(oldCode, oldPos, lintedCode, offsetFromEnd) {
  const oldLines = oldCode.split('\n')
  let lineNum = 0
  let pos = 0
  for (let i = 0; i < oldLines.length; i++) {
    const lineLen = oldLines[i].length + 1
    if (pos + lineLen > oldPos) {
      lineNum = i
      break
    }
    pos += lineLen
  }
  const newLines = lintedCode.split('\n')
  let newPos = 0
  for (let i = 0; i < lineNum && i < newLines.length; i++) newPos += newLines[i].length + 1
  const line = newLines[lineNum]
  if (line != null) newPos += Math.max(0, line.length - (offsetFromEnd || 0))
  return newPos
}

function isPreludeLine(line) {
  const t = line.trim()
  return !t || /^(const|let|import)\s/.test(t)
}

function findFirstPatternOffset(doc) {
  const lines = doc.split('\n')
  let offset = 0
  for (const line of lines) {
    if (!isPreludeLine(line)) return offset
    offset += line.length + 1
  }
  return offset
}

/**
 * Apply one palette row to the editor state.
 * @param {{ code: string, cursor: number, from?: number, to?: number }} state
 * @param {{ code?: string, imports?: string, consts?: string, insertIndex?: string|number, cursorEndOfLineOffset?: string|number }} row
 * @returns {{ code: string, cursor: number }}
 */
export function applyPalletStep(state, row) {
  let { code, cursor } = state
  const from = state.from ?? state.cursor
  const to = state.to ?? state.cursor
  const insertIndex = row.insertIndex != null && row.insertIndex !== '' ? parseInt(String(row.insertIndex), 10) : 0
  const cursorEndOfLineOffset = row.cursorEndOfLineOffset != null && row.cursorEndOfLineOffset !== '' ? parseInt(String(row.cursorEndOfLineOffset), 10) : 0
  const rowCode = (row.code || '').trim()
  const imports = (row.imports || '').trim()
  const consts = (row.consts || '').trim()

  if (imports && !code.includes(imports)) {
    const codeTrimmed = code.trimStart()
    const nextIsImport = /^\s*samples\s*\(/.test(codeTrimmed)
    const insert = imports + (code.length && !code.startsWith('\n') && !nextIsImport ? '\n\n' : '\n')
    code = insert + code
    cursor += insert.length
  }

  if (consts && !code.includes(consts)) {
    const insertAt = findFirstPatternOffset(code)
    const needLeadingNewline = insertAt > 0 && code.length >= insertAt && code[insertAt - 1] !== '\n'
    const insert = (needLeadingNewline ? '\n' : '') + consts + '\n'
    code = code.slice(0, insertAt) + insert + code.slice(insertAt)
    if (cursor <= insertAt) cursor = insertAt + insert.length
    else cursor += insert.length
  }

  if (insertIndex > 0) {
    const template = rowCode || 'stack(\n  \n)'
    const selected = code.slice(from, to)
    const content = selected.trim() ? selected.split('\n').map((l) => '  ' + l).join('\n') : ''
    const pos = Math.max(0, Math.min(insertIndex, template.length))
    const insert = template.slice(0, pos) + content + template.slice(pos)
    code = code.slice(0, from) + insert + code.slice(to)
    const endPos = from + insert.length
    const offset = Math.max(0, cursorEndOfLineOffset || 0)
    cursor = content === '' ? from + pos : endPos - offset
    const beforeLint = code
    code = lintLeadingSpaces(code)
    cursor = cursorAfterLint(beforeLint, cursor, code, content === '' ? 0 : cursorEndOfLineOffset)
  } else {
    const before = code.slice(0, cursor)
    const snippet = rowCode
    const lines = before.split('\n')
    const lastRaw = lines[lines.length - 1] || ''
    const lastLine = before.trim().split('\n').pop() || ''
    const lastLineTrimmed = lastLine.trim()
    const endsWithCall = /\)\s*$/.test(lastLineTrimmed) && !lastLineTrimmed.startsWith('.')
    const lastLineIndented = /^\s/.test(lastRaw)
    const afterCompleteStatement = !before.trim() || isPreludeLine(lastLine) || (endsWithCall && !lastLineIndented)
    const insert = needsLeadingComma(before) && !afterCompleteStatement ? ',\n  ' + snippet : snippet
    code = code.slice(0, cursor) + insert + code.slice(cursor)
    cursor += insert.length
    const beforeLint = code
    code = lintLeadingSpaces(code)
    cursor = cursorAfterLint(beforeLint, cursor, code, cursorEndOfLineOffset)
  }

  return { code, cursor }
}
