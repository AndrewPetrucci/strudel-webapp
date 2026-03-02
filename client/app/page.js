'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { applyPalletStep } from '@/lib/palletLogic'
import { fetchWithAuth, setToken } from '@/lib/auth'
import ToggleButton from '@/components/ToggleButton'

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

const DEFAULT_EDITOR_CODE = `stack(
  note("<[c2 c3]*4 [bb1 bb2]*4 [f2 f3]*4 [eb2 eb3]*4>")
    .sound("sawtooth").lpf(800),
  stack(
    sound("hh*16").gain("[.25 1]*4"),
    sound("bd*4,[~ sd:1]*2")
  )
)`

function SaveSongModal({ user, loadedSong, initialCode, saveError, onClose, onSaved, onSaveError }) {
  const isEdit = !!loadedSong
  const isCreator = isEdit && user && loadedSong.user_id != null && loadedSong.user_id === user.id

  const [name, setName] = useState('')
  const [version, setVersion] = useState('1.0')
  const [code, setCode] = useState(initialCode)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit && loadedSong) {
      setName(loadedSong.name || '')
      setVersion(loadedSong.version || '1.0')
    } else {
      setName('')
      setVersion('1.0')
    }
    setCode(initialCode)
  }, [loadedSong, isEdit, initialCode])

  function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      onSaveError('Sign in to save songs')
      return
    }
    if (isEdit && !isCreator) return
    setSaving(true)
    onSaveError(null)
    const url = isEdit ? `/api/songs/${loadedSong.id}` : '/api/songs'
    const method = isEdit ? 'PUT' : 'POST'
    const body = JSON.stringify({ name: name.trim(), version: version.trim(), code: code.trim() })
    fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body })
      .then((res) => {
        if (!res.ok) return res.json().then((data) => { throw new Error(data.error || 'Save failed') })
        return res.json()
      })
      .then((song) => onSaved(song))
      .catch((err) => onSaveError(err.message))
      .finally(() => setSaving(false))
  }

  function handleSaveAsNew() {
    if (!user) {
      onSaveError('Sign in to save songs')
      return
    }
    setSaving(true)
    onSaveError(null)
    const body = JSON.stringify({
      name: (loadedSong?.name || '').trim() || 'Untitled',
      version: (loadedSong?.version || '1.0').trim(),
      code: initialCode.trim(),
    })
    fetchWithAuth('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then((res) => {
        if (!res.ok) return res.json().then((data) => { throw new Error(data.error || 'Save failed') })
        return res.json()
      })
      .then((song) => onSaved(song))
      .catch((err) => onSaveError(err.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit song' : 'Create song'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {!user ? (
          <div className="modal-body">
            <p className="modal-message">Sign in to create or save songs.</p>
            <div className="modal-actions">
              <Link href="/login" className="save-submit-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Sign in
              </Link>
              <Link href="/signup" style={{ color: 'var(--accent)' }}>Sign up</Link>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </div>
        ) : isEdit && !isCreator ? (
          <div className="modal-body">
            <p className="modal-message">
              Only the creator can edit this song.
            </p>
            <p className="modal-hint">Save as a new song to create your own version.</p>
            <div className="modal-actions">
              <button type="button" className="save-as-new-btn" onClick={handleSaveAsNew} disabled={saving}>
                {saving ? 'Saving…' : 'Save as new song'}
              </button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
            {saveError && <p className="save-error">{saveError}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="save-form modal-body">
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. coastline"
                required
              />
            </label>
            {user && <p className="modal-hint">Saving as {user.username || user.email}</p>}
            <label>
              Version
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.0"
              />
            </label>
            <label>
              Code
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                placeholder="Strudel code from editor"
              />
            </label>
            {saveError && <p className="save-error">{saveError}</p>}
            <div className="modal-actions">
              <button type="submit" className="save-submit-btn" disabled={saving}>
                {saving ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
              </button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const replRef = useRef(null)
  const [buttons, setButtons] = useState([])
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('patterns')
  const [loadedSong, setLoadedSong] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchWithAuth('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/buttons').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/songs').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([buttonsData, songsData]) => {
        setButtons(Array.isArray(buttonsData) ? buttonsData : [])
        setSongs(Array.isArray(songsData) ? songsData : [])
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
    setLoadedSong(null)
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

  function loadSongToEditor(song) {
    setLoadedSong(song)
    const editor = getEditor(replRef.current)
    if (!editor) return
    const code = (song.code || '').trim()
    if (editor.setCode) {
      editor.setCode(code)
    } else {
      const cm = editor?.editor
      if (cm?.state) {
        const len = cm.state.doc.length
        cm.dispatch({ changes: { from: 0, to: len, insert: code }, selection: { anchor: 0, head: 0 } })
      }
    }
  }

  function getEditorCode() {
    const editor = getEditor(replRef.current)
    const cm = editor?.editor
    if (!cm?.state) return ''
    return cm.state.sliceDoc(0, cm.state.doc.length)
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
        <div className="header-left">
          <h1>Strudel Live Coding</h1>
          <p className="header-subtitle">
            Edit patterns below. Visit{' '}
            <a href="https://strudel.cc" target="_blank" rel="noopener noreferrer" className="header-docs-link">
              strudel.cc
            </a>{' '}
            for docs.
          </p>
        </div>
        <div className="header-center header-buttons">
          <button type="button" className="run-btn" onClick={runPattern} title="Run pattern">
            Run
          </button>
          <button type="button" className="stop-btn" onClick={stopPattern} title="Stop playback">
            Stop
          </button>
          <button type="button" className="update-btn" onClick={updatePattern} title="Update/run pattern (Ctrl+S)">
            Update
          </button>
          <button type="button" className="save-btn" onClick={() => setShowSaveModal(true)} title="Save song">
            Save
          </button>
        </div>
        <div className="header-right">
          {user ? (
            <>
              <span className="header-user">{user.username || user.email}</span>
              <button
                type="button"
                className="signout-link"
                onClick={() => { setToken(null); setUser(null) }}
                title="Sign out"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="auth-header-btn">Sign in</Link>
              <Link href="/signup" className="auth-header-btn">Sign up</Link>
            </>
          )}
        </div>
      </header>

      {showSaveModal && (
        <SaveSongModal
          user={user}
          loadedSong={loadedSong}
          initialCode={getEditorCode()}
          saveError={saveError}
          onClose={() => { setShowSaveModal(false); setSaveError(null) }}
          onSaved={(song) => {
            setLoadedSong(song)
            setShowSaveModal(false)
            setSaveError(null)
            setSongs((prev) => {
              const idx = prev.findIndex((s) => s.id === song.id)
              if (idx >= 0) return prev.map((s, i) => (i === idx ? song : s))
              return [...prev, song]
            })
          }}
          onSaveError={setSaveError}
        />
      )}

      <main>
        <div>
          <div className={`pallet-buttons ${mode === 'patterns' ? 'mode-patterns' : ''}`} aria-label="Palette buttons (from API)">
            <button type="button" className="pallet-btn clear-btn" onClick={clearEditor} title="Clear">
              Clear
            </button>
            <ToggleButton
              options={[
                { value: 'songs', label: 'Songs' },
                { value: 'patterns', label: 'Patterns' },
              ]}
              value={mode}
              onChange={setMode}
              ariaLabel="Toggle songs or patterns"
            />
            {loading && <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</span>}
            {error && (
              <span style={{ color: '#b91c1c', fontSize: '0.9rem' }} title={error}>
                Failed to load
              </span>
            )}
            {!loading && !error && mode === 'patterns' &&
              buttons.map((row) => {
                const id = row.id || row.name?.toLowerCase().replace(/\s+/g, '-')
                const name = row.name || id
                return (
                  <button
                    key={id}
                    type="button"
                    className="pallet-btn pattern-btn"
                    title={name}
                    onClick={() => applyPalletRowToEditor(row)}
                  >
                    {name}
                  </button>
                )
              })}
            {!loading && !error && mode === 'songs' &&
              songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  className="pallet-btn"
                  title={`${song.name} by ${song.author || '?'}`}
                  onClick={() => loadSongToEditor(song)}
                >
                  {song.name}
                </button>
              ))}
          </div>
          <section className="repl-container">
            <strudel-editor id="strudel-repl" ref={replRef} code={DEFAULT_EDITOR_CODE} />
          </section>
        </div>
      </main>
    </>
  )
}
