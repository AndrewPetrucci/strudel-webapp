'use client'

import { useEffect, useRef, useState } from 'react'
import { applyPalletStep } from '@/lib/palletLogic'

/** Map API row (snake_case) to pallet row (camelCase) for applyPalletStep */
function apiRowToPalletRow(apiRow) {
  return {
    id: apiRow.id,
    name: apiRow.name,
    code: apiRow.code,
    cursorEndOfLineOffset: apiRow.cursor_end_of_line_offset,
    insertIndex: apiRow.insert_index,
    imports: apiRow.imports,
    consts: apiRow.consts,
    group: apiRow.button_group,
  }
}

function getEditor(replEl) {
  return replEl?.editor ?? null
}

export default function Home() {
  const replRef = useRef(null)
  const [buttons, setButtons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/buttons')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load buttons')
        return res.json()
      })
      .then((data) => {
        setButtons(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function runPattern() {
    const editor = getEditor(replRef.current)
    if (!editor) return
    editor.stop?.()
    if (editor.evaluate) editor.evaluate(true)
  }

  function stopPattern() {
    const editor = getEditor(replRef.current)
    if (editor?.stop) editor.stop()
  }

  function updatePattern() {
    const editor = getEditor(replRef.current)
    if (editor?.evaluate) editor.evaluate()
  }

  function clearEditor() {
    const editor = getEditor(replRef.current)
    if (!editor) return
    if (editor.setCode) {
      editor.setCode('')
    } else {
      const cm = editor?.editor
      if (cm?.state) {
        const len = cm.state.doc.length
        cm.dispatch({ changes: { from: 0, to: len, insert: '' }, selection: { anchor: 0, head: 0 } })
      }
    }
  }

  function applyPalletRowToEditor(row) {
    const editor = getEditor(replRef.current)
    const cm = editor?.editor
    if (!cm?.state) return
    const code = cm.state.sliceDoc(0, cm.state.doc.length)
    const { from, to, head } = cm.state.selection.main
    const palletRow = apiRowToPalletRow(row)
    const state = applyPalletStep({ code, cursor: head, from, to }, palletRow)
    cm.dispatch({
      changes: { from: 0, to: code.length, insert: state.code },
      selection: { anchor: state.cursor, head: state.cursor },
    })
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        updatePattern()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <header className="header-row">
        <div>
          <h1>Strudel Live Coding</h1>
          <p>
            Edit patterns below. Visit{' '}
            <a href="https://strudel.cc" target="_blank" rel="noopener noreferrer">
              strudel.cc
            </a>{' '}
            for docs.
          </p>
        </div>
        <div className="header-buttons">
          <button type="button" className="run-btn" onClick={runPattern} title="Run pattern">
            Run
          </button>
          <button type="button" className="stop-btn" onClick={stopPattern} title="Stop playback">
            Stop
          </button>
          <button type="button" className="update-btn" onClick={updatePattern} title="Update/run pattern (Ctrl+S)">
            Update
          </button>
        </div>
      </header>

      <main>
        <div>
          <div className="pallet-buttons" aria-label="Palette buttons (from API)">
            <button type="button" className="pallet-btn" onClick={clearEditor} title="Clear">
              Clear
            </button>
            {loading && <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</span>}
            {error && (
              <span style={{ color: '#b91c1c', fontSize: '0.9rem' }} title={error}>
                Failed to load buttons
              </span>
            )}
            {!loading &&
              !error &&
              buttons.map((row) => {
                const id = row.id || row.name?.toLowerCase().replace(/\s+/g, '-')
                const name = row.name || id
                return (
                  <button
                    key={id}
                    type="button"
                    className="pallet-btn"
                    title={name}
                    onClick={() => applyPalletRowToEditor(row)}
                  >
                    {name}
                  </button>
                )
              })}
          </div>
          <section className="repl-container">
            <strudel-editor id="strudel-repl" ref={replRef} />
          </section>
        </div>
      </main>
    </>
  )
}
