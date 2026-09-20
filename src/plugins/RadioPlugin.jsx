import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Radio, Loader } from 'lucide-react';

async function api(path, opts) {
  const res = await fetch(`/api/nexus/aether/${path}`, opts);
  return res.json();
}

export function RadioPlugin() {
  const [status, setStatus] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  // Poll now-playing / queue while panel mounted
  useEffect(() => {
    let alive = true;
    async function poll() {
      try { const s = await api('status'); if (alive) setStatus(s); } catch { /* offline */ }
    }
    poll();
    const t = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function toggleStream() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  async function transport(cmd) {
    setLoading(true);
    try { await api(`radio/${cmd}`, { method: 'POST' }); }
    finally {
      setLoading(false);
      try { setStatus(await api('status')); } catch { /* */ }
    }
  }

  const streamUrl = status?.stream_url || '';
  const icecastUp = status?.icecast;
  const mpdInstalled = status?.mpd_installed;

  return (
    <div className="plugin-radio">
      <audio ref={audioRef} src={streamUrl} preload="none" />

      {/* Now playing */}
      <div className="radio-now">
        <Radio size={18} className={playing ? 'radio-live' : 'opacity-40'} />
        <div className="radio-now-meta">
          <span className="radio-track">{status?.now_playing || (mpdInstalled ? 'Nothing queued' : 'MPD not installed')}</span>
          <span className="radio-state">
            {icecastUp ? `● LIVE · ${status?.state || 'stopped'}` : '○ Icecast offline'}
          </span>
        </div>
      </div>

      {/* Transport */}
      <div className="radio-transport">
        <button className="dock-action-btn" onClick={() => transport('prev')} disabled={loading} title="Previous">
          <SkipBack size={16} />
        </button>
        <button className="radio-play-btn" onClick={toggleStream} title={playing ? 'Stop stream' : 'Play stream'} disabled={!icecastUp}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="dock-action-btn" onClick={() => transport('pause')} disabled={loading} title="MPD pause/resume">
          {loading ? <Loader size={16} className="animate-spin" /> : <Pause size={16} />}
        </button>
        <button className="dock-action-btn" onClick={() => transport('next')} disabled={loading} title="Next">
          <SkipForward size={16} />
        </button>

        <div className="radio-volume">
          <Volume2 size={15} />
          <input
            type="range" className="studio-range" min={0} max={1} step={0.01}
            value={volume} onChange={e => setVolume(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Queue */}
      <div className="radio-queue">
        <p className="plugin-section-label">Queue</p>
        {(!status?.queue || status.queue.length === 0) && (
          <p className="notes-empty">Queue empty. Add tracks via <code>nexus-aether.sh radio add</code>.</p>
        )}
        {status?.queue?.map((track, i) => (
          <div key={i} className={`radio-queue-item${track === status.now_playing ? ' radio-queue-active' : ''}`}>
            <span className="radio-queue-num">{i + 1}</span>
            <span className="radio-queue-title">{track}</span>
          </div>
        ))}
      </div>

      {!mpdInstalled && (
        <p className="radio-hint">Radio backend needs <code>doas apk add mpd mpc</code> + Icecast running.</p>
      )}
    </div>
  );
}
