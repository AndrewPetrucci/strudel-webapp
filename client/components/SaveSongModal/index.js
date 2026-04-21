'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/auth'

export default function SaveSongModal({ user, loadedSong, initialCode, saveError, onClose, onSaved, onSaveError }) {
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
