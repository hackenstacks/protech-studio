import { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, RefreshCw, Video, Smartphone } from 'lucide-react';

async function api(path, opts) {
  const res = await fetch(`/api/nexus/aether/${path}`, opts);
  return res.json();
}

// Common phone / Pi camera source templates. {IP} is replaced by the user.
const PRESETS = [
  { label: 'IP Webcam (Android, RTSP)', url: 'rtsp://{IP}:8080/h264_ulaw.sdp' },
  { label: 'IP Webcam (Android, MJPEG)', url: 'http://{IP}:8080/video' },
  { label: 'DroidCam',                   url: 'http://{IP}:4747/video' },
  { label: 'Larix / generic RTSP',       url: 'rtsp://{IP}:8554/stream' },
  { label: 'RTMP push (OBS/Larix)',      url: 'rtmp://{IP}/live/stream' },
  { label: 'Pi Zero W (libcamera RTSP)', url: 'rtsp://{IP}:8554/cam' },
];

export function CameraSourcePlugin() {
  const [status, setStatus] = useState({ up: false, cameras: [] });
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [ip, setIp] = useState('');
  const [preset, setPreset] = useState(PRESETS[0].url);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setStatus(await api('cameras')); } catch { setStatus({ up: false, cameras: [] }); }
  }
  useEffect(() => { refresh(); }, []);

  function applyPreset() {
    setUrl(preset.replace('{IP}', ip || '{IP}'));
  }

  async function addCamera() {
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await api('camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', name: name.trim(), src: url.trim() }),
      });
      setName(''); setUrl('');
      await refresh();
    } finally { setBusy(false); }
  }

  async function removeCamera(cam) {
    setBusy(true);
    try {
      await api('camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', name: cam }),
      });
      if (preview === cam) setPreview(null);
      await refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="plugin-camera">
      <div className="callin-status">
        <Camera size={18} className={status.up ? 'radio-live' : 'opacity-40'} />
        <div className="radio-now-meta">
          <span className="radio-track">Camera Sources</span>
          <span className="radio-state">{status.up ? `● go2rtc online · ${status.cameras.length} source(s)` : '○ go2rtc offline'}</span>
        </div>
        <button className="dock-action-btn" onClick={refresh} title="Refresh"><RefreshCw size={13} /></button>
      </div>

      {!status.up && (
        <p className="radio-hint">Start the hub: <code>doas rc-service go2rtc start</code> (from the aether package install).</p>
      )}

      {/* Live camera list + preview */}
      <div className="cam-list">
        {status.cameras.length === 0 && status.up && (
          <p className="notes-empty">No sources yet. Add your phone or Pi camera below.</p>
        )}
        {status.cameras.map(cam => (
          <div key={cam} className="cam-item">
            <button className={`cam-name${preview === cam ? ' cam-name-on' : ''}`} onClick={() => setPreview(preview === cam ? null : cam)}>
              <Video size={13} /> {cam}
            </button>
            <button className="dock-action-btn" onClick={() => removeCamera(cam)} disabled={busy}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="cam-preview">
          <img
            src={`/api/nexus/aether/camera-mjpeg?src=${encodeURIComponent(preview)}`}
            alt={`${preview} preview`}
          />
          <span className="cam-preview-label">◉ {preview} — live preview (MJPEG)</span>
        </div>
      )}

      {/* Add source */}
      <div className="cam-add">
        <p className="plugin-section-label"><Smartphone size={11} className="inline" /> Add phone / IP camera</p>
        <div className="cam-preset-row">
          <select className="studio-select text-xs px-2 py-1 rounded flex-1" value={preset} onChange={e => setPreset(e.target.value)}>
            {PRESETS.map(p => <option key={p.url} value={p.url}>{p.label}</option>)}
          </select>
          <input className="studio-input cam-ip" placeholder="phone IP" value={ip} onChange={e => setIp(e.target.value)} />
          <button className="dock-action-btn text-xs" onClick={applyPreset}>Fill</button>
        </div>
        <input className="studio-input" placeholder="name (e.g. phone, picam)" value={name} onChange={e => setName(e.target.value)} />
        <input className="studio-input" placeholder="rtsp:// or http:// source URL" value={url} onChange={e => setUrl(e.target.value)} />
        <button className="tpl-apply" onClick={addCamera} disabled={busy || !status.up}>
          <Plus size={14} /> Add camera source
        </button>
        <p className="cb-hint">go2rtc ingests it and serves WebRTC/MJPEG to the studio — near-zero latency, no mixed-content (proxied over HTTPS).</p>
      </div>
    </div>
  );
}
