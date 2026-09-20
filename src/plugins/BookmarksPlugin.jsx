import { useState } from 'react';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';

// Same-origin relative links — no hardcoded host. Works over localhost, LAN IP,
// .onion or .i2p, whatever the hub is reached through.
const INTERNAL = [
  { label: 'NXS-Map',       href: '/',        icon: '🗺️' },
  { label: 'Hister Search', href: '/hister',  icon: '🔍' },
  { label: 'AI Foundry',    href: '/foundry', icon: '⚗️' },
  { label: 'AI Chat',       href: '/aichat',  icon: '🤖' },
  { label: 'NeXuS Wiki',    href: '/wiki',    icon: '📖' },
  { label: 'Publisher',     href: '/publish', icon: '📡' },
  { label: 'Social (snac)', href: '/social',  icon: '🦣' },
];

const STORAGE_KEY = 'nexus_studio_bookmarks';

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

export function BookmarksPlugin() {
  const [custom, setCustom] = useState(loadCustom);
  const [form, setForm] = useState({ label: '', href: '' });
  const [adding, setAdding] = useState(false);

  function addBookmark() {
    if (!form.href.trim()) return;
    const entry = { id: Date.now(), label: form.label || form.href, href: form.href, icon: '🔗' };
    const updated = [...custom, entry];
    setCustom(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setForm({ label: '', href: '' });
    setAdding(false);
  }

  function remove(id) {
    const updated = custom.filter(b => b.id !== id);
    setCustom(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return (
    <div className="plugin-bookmarks">
      <p className="plugin-section-label">NeXuS Internal</p>
      <div className="bookmark-grid">
        {INTERNAL.map(b => (
          <a key={b.href} href={b.href} target="_blank" rel="noreferrer" className="bookmark-chip">
            <span>{b.icon}</span>
            <span>{b.label}</span>
            <ExternalLink size={11} className="opacity-40" />
          </a>
        ))}
      </div>

      {custom.length > 0 && (
        <>
          <p className="plugin-section-label mt-4">Custom</p>
          <div className="bookmark-grid">
            {custom.map(b => (
              <div key={b.id} className="bookmark-chip bookmark-chip-custom">
                <a href={b.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 flex-1 min-w-0">
                  <span>{b.icon}</span>
                  <span className="truncate">{b.label}</span>
                </a>
                <button onClick={() => remove(b.id)} className="dock-action-btn ml-1">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {adding ? (
        <div className="bookmark-add-form">
          <input
            className="studio-input flex-1"
            placeholder="Label (optional)"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
          <input
            className="studio-input flex-1"
            placeholder="URL"
            value={form.href}
            onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
          />
          <button className="dock-action-btn" onClick={addBookmark}>Add</button>
          <button className="dock-action-btn" onClick={() => setAdding(false)}>✕</button>
        </div>
      ) : (
        <button className="bookmark-add-btn" onClick={() => setAdding(true)}>
          <Plus size={13} /> Add Bookmark
        </button>
      )}
    </div>
  );
}
