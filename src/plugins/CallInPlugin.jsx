import { useState, useEffect, useRef } from 'react';
import { PhoneCall, Mic, MicOff, Wand2 } from 'lucide-react';
import { useVoiceChanger, VOICE_PRESETS } from './useVoiceChanger';

async function api(path) {
  const res = await fetch(`/api/nexus/aether/${path}`);
  return res.json();
}

export function CallInPlugin() {
  const [status, setStatus] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const streamRef = useRef(null);
  const monitorRef = useRef(null);
  const voice = useVoiceChanger();

  useEffect(() => {
    api('status').then(setStatus).catch(() => {});
  }, []);

  async function toggleMic() {
    if (micOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      voice.teardown();
      if (monitorRef.current) { monitorRef.current.pause(); monitorRef.current = null; }
      setMicOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const processed = voice.build(stream);
      // Monitor the processed voice locally (muted to avoid feedback by default)
      const el = new Audio();
      el.srcObject = processed;
      el.muted = true;
      monitorRef.current = el;
      setMicOn(true);
    } catch {
      setMicOn(false);
    }
  }

  const murmurUp = status?.murmur;

  return (
    <div className="plugin-callin">
      <div className="callin-status">
        <PhoneCall size={18} className={murmurUp ? 'radio-live' : 'opacity-40'} />
        <div className="radio-now-meta">
          <span className="radio-track">Call-in Center</span>
          <span className="radio-state">{murmurUp ? '● Murmur online :64738' : '○ Murmur offline'}</span>
        </div>
      </div>

      <div className="callin-connect">
        <p className="cb-hint">Callers connect via any Mumble client:</p>
        <code className="callin-addr">mumble://guest@127.0.0.1:64738</code>
        {!murmurUp && (
          <p className="radio-hint">Start Murmur: service control → murmur, or <code>doas rc-service murmur start</code>.</p>
        )}
      </div>

      {/* Voice changer for the caller/DJ */}
      <div className="callin-voice">
        <h3 className="cb-title"><Wand2 size={14} /> Voice Changer</h3>
        <button className={`callin-mic${micOn ? ' callin-mic-on' : ''}`} onClick={toggleMic}>
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          {micOn ? 'Mic Live' : 'Enable Mic'}
        </button>
        <div className="voice-presets">
          {VOICE_PRESETS.map(p => (
            <button
              key={p.id}
              className={`voice-preset${voice.preset === p.id ? ' voice-preset-on' : ''}`}
              onClick={() => voice.setPreset(p.id)}
              disabled={!micOn}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="cb-hint">Effects run live in-browser (Web Audio). Route the processed stream into Mumble/OBS as a virtual mic.</p>
      </div>
    </div>
  );
}
