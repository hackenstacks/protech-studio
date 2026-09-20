import { useState, useEffect } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';

const STORAGE_KEY = 'nexus_studio_notes';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function NotesPlugin() {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(null);

  const active = notes.find(n => n.id === activeId);

  useEffect(() => {
    if (notes.length && !activeId) setActiveId(notes[0].id);
  }, [notes, activeId]);

  function newNote() {
    const note = { id: Date.now(), title: 'New Note', body: '', ts: new Date().toISOString() };
    const updated = [note, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setActiveId(note.id);
  }

  function updateBody(body) {
    const updated = notes.map(n => n.id === activeId ? { ...n, body, ts: new Date().toISOString() } : n);
    setNotes(updated);
    saveNotes(updated);
  }

  function updateTitle(title) {
    const updated = notes.map(n => n.id === activeId ? { ...n, title } : n);
    setNotes(updated);
    saveNotes(updated);
  }

  function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
  }

  return (
    <div className="plugin-notes">
      {/* Sidebar */}
      <div className="notes-sidebar">
        <button className="notes-new-btn" onClick={newNote}>
          <Plus size={14} /> New Note
        </button>
        <div className="notes-list">
          {notes.length === 0 && (
            <p className="notes-empty">No notes yet. Hit + to start.</p>
          )}
          {notes.map(n => (
            <div
              key={n.id}
              className={`notes-item${n.id === activeId ? ' notes-item-active' : ''}`}
              onClick={() => setActiveId(n.id)}
            >
              <span className="notes-item-title">{n.title || 'Untitled'}</span>
              <span className="notes-item-ts">{new Date(n.ts).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="notes-editor">
        {active ? (
          <>
            <div className="notes-editor-top">
              <input
                className="notes-title-input studio-input"
                value={active.title}
                onChange={e => updateTitle(e.target.value)}
                placeholder="Note title…"
              />
              <button className="dock-action-btn" onClick={() => deleteNote(active.id)} title="Delete note">
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              className="notes-textarea studio-input"
              value={active.body}
              onChange={e => updateBody(e.target.value)}
              placeholder="Start writing…"
            />
          </>
        ) : (
          <div className="notes-placeholder">
            <p>Select a note or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
