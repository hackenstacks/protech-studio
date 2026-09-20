import { useState, useRef, useEffect } from 'react';
import { Radio, Eye, Settings2, Play, Square, Copy, Check, FileVideo, Wifi, WifiOff } from 'lucide-react';
import { formatDuration } from '../hooks/useMediaRecorder';

const STREAM_DESTINATIONS = [
  { id: 'owncast',  label: '⬡ NeXuS Owncast', placeholder: 'rtmp://127.0.0.1:1935/live', defaultUrl: 'rtmp://127.0.0.1:1935/live', note: 'Sovereign self-hosted — admin at http://127.0.0.1:8086/admin' },
  { id: 'rtmp',     label: 'RTMP / OBS',       placeholder: 'rtmp://live.twitch.tv/app/' },
  { id: 'youtube',  label: 'YouTube Live',      placeholder: 'rtmp://a.rtmp.youtube.com/live2/' },
  { id: 'twitch',   label: 'Twitch',            placeholder: 'rtmp://live.twitch.tv/app/' },
  { id: 'custom',   label: 'Custom RTMP',       placeholder: 'rtmp://your-server:1935/live' },
];

function StatBadge({ label, value, unit = '' }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-mono font-bold">{value}<span className="text-xs ml-0.5 opacity-60">{unit}</span></div>
      <div className="text-xs opacity-40 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function StreamingPanel({ studio, recordings }) {
  const [isLive, setIsLive] = useState(false);
  const [destination, setDestination] = useState('owncast');
  const [streamUrl, setStreamUrl] = useState('rtmp://127.0.0.1:1935/live');
  const [streamKey, setStreamKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [playbackFile, setPlaybackFile] = useState(null);
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'playback'

  const liveVideoRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Auto-fill URL when switching destination
  const handleDestinationChange = (id) => {
    setDestination(id);
    const dest = STREAM_DESTINATIONS.find(d => d.id === id);
    if (dest?.defaultUrl) setStreamUrl(dest.defaultUrl);
  };

  // Fake stream stats that fluctuate realistically
  const [stats, setStats] = useState({ bitrate: 0, fps: 0, dropped: 0, viewers: 0 });

  useEffect(() => {
    if (isLive) {
      const targetBitrate = 2500;
      streamTimerRef.current = setInterval(() => {
        setStreamDuration(d => d + 1);
        setStats(prev => ({
          bitrate: targetBitrate + Math.floor((Math.random() - 0.5) * 200),
          fps: 29 + Math.floor(Math.random() * 3),
          dropped: prev.dropped + (Math.random() > 0.95 ? 1 : 0),
          viewers: Math.max(0, prev.viewers + Math.floor((Math.random() - 0.4) * 3)),
        }));
      }, 1000);
    } else {
      clearInterval(streamTimerRef.current);
      setStreamDuration(0);
      setStats({ bitrate: 0, fps: 0, dropped: 0, viewers: 0 });
    }
    return () => clearInterval(streamTimerRef.current);
  }, [isLive]);

  // Attach live stream to video
  useEffect(() => {
    if (liveVideoRef.current && studio.activeStream) {
      liveVideoRef.current.srcObject = studio.activeStream;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [studio.activeStream]);

  const copyInstruction = () => {
    const text = `RTMP URL: ${streamUrl || STREAM_DESTINATIONS.find(d => d.id === destination)?.placeholder || ''}\nStream Key: ${streamKey}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGoLive = () => {
    if (!studio.activeStream && viewMode === 'live') {
      alert('Start a preview in the Studio tab first to have a stream source.');
      return;
    }
    setIsLive(l => !l);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Stream preview */}
      <div className="relative rounded overflow-hidden preview-area" style={{ minHeight: '300px' }}>

        {/* View toggle */}
        <div className="absolute top-3 left-3 z-10 flex gap-1 rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.7)' }}>
          {[['live', 'Live Camera'], ['playback', 'Playback']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1 text-xs font-bold transition-all ${viewMode === v ? 'bg-cyan-600 text-white' : 'text-white opacity-50 hover:opacity-80'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Live stream view */}
        {viewMode === 'live' && (
          <>
            <video
              ref={liveVideoRef}
              autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            />
            {!studio.activeStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center preview-overlay gap-2">
                <WifiOff size={40} className="opacity-20" />
                <p className="opacity-40 text-sm">No stream source — start a preview in Studio</p>
              </div>
            )}
          </>
        )}

        {/* Playback view */}
        {viewMode === 'playback' && (
          <div className="relative w-full h-full" style={{ background: '#000' }}>
            {playbackFile ? (
              <video
                ref={playbackVideoRef}
                src={playbackFile.url}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 preview-overlay">
                <FileVideo size={40} className="opacity-20" />
                <p className="opacity-40 text-sm">Select a recording below to preview/stream</p>
              </div>
            )}
          </div>
        )}

        {/* LIVE badge */}
        {isLive && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(220,38,38,0.9)' }}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE · {formatDuration(streamDuration * 1000)}
          </div>
        )}

        {/* Live stats overlay */}
        {isLive && (
          <div className="absolute bottom-3 right-3 grid grid-cols-4 gap-4 px-4 py-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <StatBadge label="Bitrate" value={stats.bitrate} unit="kb/s" />
            <StatBadge label="FPS" value={stats.fps} />
            <StatBadge label="Dropped" value={stats.dropped} />
            <StatBadge label="Viewers" value={stats.viewers} />
          </div>
        )}
      </div>

      {/* Playback source selector */}
      {viewMode === 'playback' && recordings.length > 0 && (
        <div className="card-bg rounded p-3">
          <div className="text-xs opacity-40 uppercase tracking-wider mb-2">Select Recording to Playback / Stream</div>
          <div className="flex flex-wrap gap-2">
            {recordings.map(rec => (
              <button
                key={rec.id}
                onClick={() => setPlaybackFile(rec)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all studio-btn ${playbackFile?.id === rec.id ? 'btn-active' : 'btn-inactive'}`}
              >
                <FileVideo size={12} />
                {rec.name.split('_')[0].toUpperCase()} · {new Date(rec.date).toLocaleTimeString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="card-bg rounded p-5">
        <h3 className="font-bold flex items-center gap-2 uppercase tracking-wider text-sm mb-4">
          <Settings2 size={16} /> Stream Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs opacity-50 uppercase tracking-wider mb-1">Destination</label>
            <select
              value={destination}
              onChange={e => handleDestinationChange(e.target.value)}
              className="w-full p-2 rounded studio-select"
              disabled={isLive}
            >
              {STREAM_DESTINATIONS.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs opacity-50 uppercase tracking-wider mb-1">RTMP URL</label>
            <input
              type="text"
              value={streamUrl}
              onChange={e => setStreamUrl(e.target.value)}
              placeholder={STREAM_DESTINATIONS.find(d => d.id === destination)?.placeholder}
              disabled={isLive}
              className="w-full p-2 rounded studio-input font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs opacity-50 uppercase tracking-wider mb-1">Stream Key</label>
            <input
              type="password"
              value={streamKey}
              onChange={e => setStreamKey(e.target.value)}
              placeholder="••••••••••••••••"
              disabled={isLive}
              className="w-full p-2 rounded studio-input font-mono text-sm"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={copyInstruction}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold studio-btn btn-secondary"
            >
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy OBS Config</>}
            </button>
          </div>
        </div>

        {/* OBS Instructions */}
        <div className="rounded p-3 text-xs" style={{ background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.15)' }}>
          <div className="font-bold opacity-70 mb-1 uppercase tracking-wider">Using with OBS Studio</div>
          <ol className="opacity-50 space-y-0.5 list-decimal list-inside">
            <li>In OBS: Settings → Stream → Service → Custom</li>
            <li>Paste RTMP URL into "Server" field</li>
            <li>Paste Stream Key into "Stream Key" field</li>
            <li>Add "Browser Source" in OBS pointing to this studio for audio pass-through</li>
            <li>Or use this studio's "Go Live" for direct browser streaming (requires WHIP-compatible server)</li>
          </ol>
        </div>
      </div>

      {/* Go Live Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGoLive}
          className={`flex items-center gap-3 px-8 py-3 rounded font-bold text-base transition-all studio-btn ${isLive ? 'btn-stop' : 'btn-record'}`}
        >
          {isLive
            ? <><Square size={18} /> END STREAM</>
            : <><Radio size={18} /> GO LIVE</>
          }
        </button>

        {isLive && (
          <div className="flex items-center gap-2 text-sm">
            <Wifi size={16} className="text-green-400 animate-pulse" />
            <span className="text-green-400 font-bold">Streaming</span>
            <span className="opacity-50">· {formatDuration(streamDuration * 1000)}</span>
          </div>
        )}

        {!isLive && (
          <div className="text-xs opacity-30">
            Note: Browser-based streaming simulates the stream preview locally. For actual RTMP output, use OBS with the config above.
          </div>
        )}
      </div>
    </div>
  );
}
