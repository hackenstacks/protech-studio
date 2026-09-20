import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Same-origin relative links — no hardcoded host.
const DEFAULT_PLATFORMS = [
  { id: 'snac',   label: 'snac',   icon: '🦣', href: '/social' },
  { id: 'matrix', label: 'Matrix', icon: '💬', href: '/matrix' },
];

const STORAGE_KEY = 'nexus_studio_platforms';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_PLATFORMS; } catch { return DEFAULT_PLATFORMS; }
}

export function PlatformsPlugin() {
  const [platforms, setPlatforms] = useState(load);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: '', href: '', icon: '🔗' });

  function add() {
    if (!form.href.trim()) return;
    const entry = { id: Date.now(), ...form, label: form.label || form.href };
    const updated = [...platforms, entry];
    setPlatforms(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setForm({ label: '', href: '', icon: '🔗' });
    setAdding(false);
  }

  function remove(id) {
    const updated = platforms.filter(p => p.id !== id);
    setPlatforms(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return (
    <div className="plugin-strip">
      <p className="plugin-section-label mb-2">Social Platforms</p>
      <div className="strip-grid">
        {platforms.map(p => (
          <div key={p.id} className="strip-chip-wrap">
            <a
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="strip-chip flex-1"
              title={p.label}
            >
              <span className="strip-icon">{p.icon}</span>
              <span className="strip-label">{p.label}</span>
            </a>
            {!DEFAULT_PLATFORMS.find(d => d.id === p.id) && (
              <button className="dock-action-btn strip-remove" onClick={() => remove(p.id)}>
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}

        {adding ? (
          <div className="strip-add-form">
            <input className="studio-input text-xs" placeholder="Emoji" value={form.icon}
              style={{ width: '2.5rem' }}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            <input className="studio-input text-xs flex-1" placeholder="Label"
              value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            <input className="studio-input text-xs flex-1" placeholder="URL"
              value={form.href} onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="dock-action-btn text-xs" onClick={add}>+</button>
            <button className="dock-action-btn text-xs" onClick={() => setAdding(false)}>✕</button>
          </div>
        ) : (
          <button className="strip-chip strip-chip-add" onClick={() => setAdding(true)}>
            <Plus size={12} /> Add
          </button>
        )}
      </div>
    </div>
  );
}
