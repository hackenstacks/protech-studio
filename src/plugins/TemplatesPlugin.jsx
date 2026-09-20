import { useState } from 'react';
import { Check, Rocket } from 'lucide-react';
import { TEMPLATES, PUBLISH_TARGETS, ANNOUNCE_CHANNELS } from './templates';

async function enableNetwork(net) {
  try {
    await fetch(`/api/nexus/aether/network/${net}/enable`, { method: 'POST' });
  } catch { /* offline — best effort */ }
}

export function TemplatesPlugin({ plugins, app }) {
  const [applied, setApplied] = useState(null);
  const [form, setForm] = useState({});
  const [selected, setSelected] = useState(null);

  async function applyTemplate(t) {
    setSelected(t.id);
    // 1. theme + main tab
    app?.setTheme?.(t.theme);
    app?.setTab?.(t.tab);
    // 2. auto-open the panels this production needs
    t.panels.forEach(id => plugins?.open?.(id));
    // 3. enable broadcast networks
    for (const net of t.networks) await enableNetwork(net);
    // 4. remember the active production (for publish + export later)
    const prod = { template: t.id, theme: t.theme, form: {}, ts: Date.now() };
    setApplied(t.id);
    setForm({});
    try { localStorage.setItem('nexus_active_production', JSON.stringify(prod)); } catch { /* */ }
  }

  const active = TEMPLATES.find(t => t.id === selected);

  return (
    <div className="plugin-templates">
      <div className="tpl-gallery">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`tpl-card${applied === t.id ? ' tpl-card-applied' : ''}${selected === t.id ? ' tpl-card-sel' : ''}`}
            onClick={() => setSelected(t.id)}
          >
            <span className="tpl-icon">{t.icon}</span>
            <span className="tpl-label">{t.label}</span>
            <span className="tpl-tagline">{t.tagline}</span>
            {applied === t.id && <span className="tpl-badge"><Check size={11} /> active</span>}
          </button>
        ))}
      </div>

      {active && (
        <div className="tpl-detail">
          <div className="tpl-detail-head">
            <span className="tpl-icon">{active.icon}</span>
            <div>
              <h3 className="cb-title">{active.label}</h3>
              <p className="cb-tagline">{active.tagline}</p>
            </div>
          </div>

          <div className="tpl-meta">
            <div className="tpl-meta-row"><span>Theme</span><b>{active.theme}</b></div>
            <div className="tpl-meta-row"><span>Panels</span><b>{active.panels.join(' · ') || '—'}</b></div>
            {active.networks.length > 0 && (
              <div className="tpl-meta-row"><span>Networks</span><b>{active.networks.join(' · ')}</b></div>
            )}
            {active.publish.length > 0 && (
              <div className="tpl-meta-row"><span>Publish</span>
                <b>{active.publish.map(p => PUBLISH_TARGETS[p]?.icon + PUBLISH_TARGETS[p]?.label).join(' ')}</b>
              </div>
            )}
            {active.announce.length > 0 && (
              <div className="tpl-meta-row"><span>Announce</span>
                <b>{active.announce.map(a => ANNOUNCE_CHANNELS[a]?.icon + ANNOUNCE_CHANNELS[a]?.label).join(' ')}</b>
              </div>
            )}
            {active.tts && <div className="tpl-meta-row"><span>Voice</span><b>{active.tts}</b></div>}
            {active.broadcastMode && <div className="tpl-meta-row"><span>Broadcast Mode</span><b>⚡ on go-live</b></div>}
          </div>

          {active.form.length > 0 && (
            <div className="tpl-form">
              {active.form.map(f => (
                <input
                  key={f.name}
                  className="studio-input"
                  placeholder={f.label + (f.placeholder ? ` (${f.placeholder})` : '')}
                  value={form[f.name] || ''}
                  onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))}
                />
              ))}
            </div>
          )}

          <button className="tpl-apply" onClick={() => applyTemplate(active)}>
            <Rocket size={15} /> Load “{active.label}” production
          </button>
        </div>
      )}
    </div>
  );
}
