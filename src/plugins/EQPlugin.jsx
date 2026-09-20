import { useState, useEffect, useRef } from 'react';

const BANDS = [
  { label: '32',  freq: 32   },
  { label: '64',  freq: 64   },
  { label: '125', freq: 125  },
  { label: '250', freq: 250  },
  { label: '500', freq: 500  },
  { label: '1k',  freq: 1000 },
  { label: '2k',  freq: 2000 },
  { label: '4k',  freq: 4000 },
  { label: '8k',  freq: 8000 },
  { label: '16k', freq: 16000},
];

const DEFAULT_GAIN = Object.fromEntries(BANDS.map(b => [b.freq, 0]));

export function EQPlugin() {
  const [gains, setGains] = useState(DEFAULT_GAIN);
  const [visualBars, setVisualBars] = useState(BANDS.map(() => Math.random() * 0.4));
  const animRef = useRef(null);

  useEffect(() => {
    function tick() {
      setVisualBars(prev => prev.map((v, i) => {
        const target = 0.1 + Math.random() * 0.7;
        return v + (target - v) * 0.08;
      }));
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function setGain(freq, val) {
    setGains(prev => ({ ...prev, [freq]: Number(val) }));
  }

  function reset() {
    setGains(DEFAULT_GAIN);
  }

  return (
    <div className="plugin-eq">
      {/* Spectrum visualizer */}
      <div className="eq-spectrum">
        {BANDS.map((b, i) => (
          <div key={b.freq} className="eq-bar-wrap">
            <div
              className="eq-spectrum-bar"
              style={{ height: `${Math.round(visualBars[i] * 100)}%` }}
            />
          </div>
        ))}
      </div>

      {/* EQ sliders */}
      <div className="eq-sliders">
        {BANDS.map(b => (
          <div key={b.freq} className="eq-band">
            <input
              type="range"
              className="studio-range eq-fader"
              min={-12}
              max={12}
              step={0.5}
              value={gains[b.freq]}
              onChange={e => setGain(b.freq, e.target.value)}
              style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '80px', width: '4px' }}
            />
            <span className="eq-gain">{gains[b.freq] > 0 ? '+' : ''}{gains[b.freq]}</span>
            <span className="eq-freq">{b.label}</span>
          </div>
        ))}
      </div>

      <div className="eq-footer">
        <button className="dock-action-btn text-xs" onClick={reset}>Reset All</button>
        <span className="notes-empty text-xs">EQ shape applied via Web Audio API when chain is active.</span>
      </div>
    </div>
  );
}
