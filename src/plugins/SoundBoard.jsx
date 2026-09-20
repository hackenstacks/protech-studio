import { useRef } from 'react';

// Synthesized quick-fire SFX pads — real Web Audio, no asset files needed.
// User can extend by dropping clips into the Vault later.
const PADS = [
  { id: 'airhorn',  label: 'Airhorn',  color: '#ff00aa' },
  { id: 'beep',     label: 'Beep',     color: '#00f3ff' },
  { id: 'drop',     label: 'Drop',     color: '#00ff41' },
  { id: 'laser',    label: 'Laser',    color: '#ffcc00' },
  { id: 'applause', label: 'Applause', color: '#ff8800' },
  { id: 'riser',    label: 'Riser',    color: '#aa66ff' },
  { id: 'sub',      label: 'Sub Boom', color: '#ff4444' },
  { id: 'coin',     label: 'Coin',     color: '#44ffcc' },
];

export function SoundBoard() {
  const ctxRef = useRef(null);
  function ctx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }

  function play(id) {
    const ac = ctx();
    const now = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);

    if (id === 'airhorn') {
      [440, 550, 660].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = f; o.connect(g); o.start(now); o.stop(now + 0.6);
      });
      g.gain.setValueAtTime(0.25, now); g.gain.setValueAtTime(0.25, now + 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    } else if (id === 'beep') {
      const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 880;
      o.connect(g); g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); o.start(now); o.stop(now + 0.15);
    } else if (id === 'drop' || id === 'sub') {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(id === 'sub' ? 120 : 400, now);
      o.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      o.connect(g); g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6); o.start(now); o.stop(now + 0.6);
    } else if (id === 'laser') {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(1200, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.3);
      o.connect(g); g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.start(now); o.stop(now + 0.3);
    } else if (id === 'riser') {
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(200, now);
      o.frequency.exponentialRampToValueAtTime(2000, now + 1.2);
      o.connect(g); g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0.001, now + 1.2); o.start(now); o.stop(now + 1.2);
    } else if (id === 'coin') {
      [988, 1319].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
        o.connect(g); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.09);
      });
      g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else if (id === 'applause') {
      const buf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ac.createBufferSource(); s.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000;
      s.connect(bp); bp.connect(g); g.gain.value = 0.4; s.start(now);
    }
  }

  return (
    <div className="soundboard">
      {PADS.map(p => (
        <button
          key={p.id}
          className="sound-pad"
          style={{ '--pad': p.color }}
          onClick={() => play(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
