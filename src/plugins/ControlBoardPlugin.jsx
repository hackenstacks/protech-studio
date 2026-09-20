import { useState, useEffect } from 'react';
import { Bot, Sliders, Radio as RadioIcon, Wifi, Zap, Power, ShieldCheck } from 'lucide-react';
import { SoundBoard } from './SoundBoard';

async function api(path, opts) {
  const res = await fetch(`/api/nexus/aether/${path}`, opts);
  return res.json();
}

const NETWORKS = ['tor', 'i2p', 'yggdrasil', 'nostr', 'matrix', 'activitypub'];
const AI_SCOPES = [
  { id: 'radio',     label: 'Radio transport' },
  { id: 'soundboard',label: 'Soundboard'      },
  { id: 'chat',      label: 'Fireside chat'   },
  { id: 'networks',  label: 'Networks / broadcast' },
];

export function ControlBoardPlugin({ plugins }) {
  const [nets, setNets] = useState({});
  const [authority, setAuthority] = useState({ enabled: false, scopes: {} });
  const [session, setSession] = useState({ title: 'Forge Session', live: false });
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api('networks').then(d => setNets(d.networks || {})).catch(() => {});
    api('authority').then(setAuthority).catch(() => {});
  }, []);

  async function toggleNet(net) {
    setBusy(net);
    const action = nets[net] ? 'disable' : 'enable';
    try {
      await api(`network/${net}/${action}`, { method: 'POST' });
      const d = await api('networks'); setNets(d.networks || {});
    } finally { setBusy(''); }
  }

  async function saveAuthority(next) {
    setAuthority(next);
    await api('authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function toggleAutopilot() {
    saveAuthority({ ...authority, enabled: !authority.enabled });
  }
  function toggleScope(id) {
    saveAuthority({ ...authority, scopes: { ...authority.scopes, [id]: !authority.scopes?.[id] } });
  }

  async function goLive() {
    setBusy('live');
    try {
      const r = await api('broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: session.title, live: true, stream_url: '' }),
      });
      setSession(s => ({ ...s, live: true, rtmp: r.rtmp_ingest, out: r.output }));
    } finally { setBusy(''); }
  }

  return (
    <div className="plugin-controlboard">

      {/* ── Forge Sessions ── */}
      <section className="cb-section">
        <h3 className="cb-title"><Zap size={14} /> Forge Sessions</h3>
        <p className="cb-tagline">The Forge Beyond the CoDe where the code becomes alive</p>
        <div className="cb-row">
          <input
            className="studio-input flex-1"
            value={session.title}
            onChange={e => setSession(s => ({ ...s, title: e.target.value }))}
            placeholder="Session title…"
          />
          <button
            className={`cb-golive${session.live ? ' cb-golive-on' : ''}`}
            onClick={goLive}
            disabled={busy === 'live'}
          >
            <Power size={14} /> {session.live ? 'LIVE' : 'GO LIVE'}
          </button>
        </div>
        {session.rtmp && (
          <p className="cb-hint">RTMP ingest: <code>{session.rtmp}</code> — point ffmpeg/OBS here.</p>
        )}
      </section>

      {/* ── Networks ── */}
      <section className="cb-section">
        <h3 className="cb-title"><Wifi size={14} /> Broadcast Networks</h3>
        <div className="cb-net-grid">
          {NETWORKS.map(net => (
            <button
              key={net}
              className={`cb-net${nets[net] ? ' cb-net-on' : ''}`}
              onClick={() => toggleNet(net)}
              disabled={busy === net}
            >
              <span className={`cb-dot${nets[net] ? ' cb-dot-on' : ''}`} />
              {net}
            </button>
          ))}
        </div>
      </section>

      {/* ── AI Autopilot (Captain's Chair) ── */}
      <section className="cb-section">
        <h3 className="cb-title"><Bot size={14} /> AI Autopilot</h3>
        <p className="cb-hint">
          <ShieldCheck size={11} className="inline" /> You hold full authority. The AI acts only within the scopes you grant, and only while the master switch is on.
        </p>
        <div className="cb-row cb-autopilot-master">
          <span>Master switch</span>
          <button
            className={`cb-switch${authority.enabled ? ' cb-switch-on' : ''}`}
            onClick={toggleAutopilot}
          >
            <span className="cb-switch-knob" />
          </button>
        </div>
        <div className={`cb-scopes${authority.enabled ? '' : ' cb-scopes-locked'}`}>
          {AI_SCOPES.map(s => (
            <label key={s.id} className="cb-scope">
              <input
                type="checkbox"
                checked={!!authority.scopes?.[s.id]}
                disabled={!authority.enabled}
                onChange={() => toggleScope(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </section>

      {/* ── Quick launches ── */}
      <section className="cb-section">
        <h3 className="cb-title"><Sliders size={14} /> Quick Launch</h3>
        <div className="cb-row cb-launch-row">
          <button className="dock-action-btn" onClick={() => plugins?.toggle('eq')}>
            <Sliders size={13} /> EQ
          </button>
          <button className="dock-action-btn" onClick={() => plugins?.toggle('radio')}>
            <RadioIcon size={13} /> Radio
          </button>
          <button className="dock-action-btn" onClick={() => plugins?.toggle('fireside')}>
            <Bot size={13} /> Fireside
          </button>
        </div>
      </section>

      {/* ── Soundboard ── */}
      <section className="cb-section">
        <h3 className="cb-title"><Zap size={14} /> Soundboard</h3>
        <SoundBoard />
      </section>
    </div>
  );
}
