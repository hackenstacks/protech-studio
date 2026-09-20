import { Sliders, RotateCcw, Music, Video } from 'lucide-react';

const Knob = ({ label, value, min, max, step = 0.01, onChange, unit = '', color }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs opacity-50 uppercase tracking-wider">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="studio-range"
        style={{ accentColor: color || 'currentColor' }}
      />
      <div className="text-xs font-mono opacity-70">
        {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 0) : value}{unit}
      </div>
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="text-xs opacity-50 uppercase tracking-wider">{label}</div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-cyan-500' : 'opacity-30 bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
    <div className="text-xs font-mono opacity-50">{checked ? 'ON' : 'OFF'}</div>
  </div>
);

const VIDEO_FILTERS = {
  normal:    { label: 'Normal',    css: 'none' },
  vintage:   { label: 'Vintage',   css: 'sepia(0.55) contrast(1.2) brightness(0.9) saturate(0.8)' },
  cyberpunk: { label: 'Cyberpunk', css: 'hue-rotate(200deg) saturate(2.5) contrast(1.3)' },
  bw:        { label: 'B&W',       css: 'grayscale(1) contrast(1.3)' },
  warm:      { label: 'Warm',      css: 'sepia(0.3) saturate(1.8) brightness(1.05)' },
  cold:      { label: 'Cold',      css: 'hue-rotate(175deg) saturate(0.9) brightness(1.1)' },
  neon:      { label: 'Neon',      css: 'saturate(3) contrast(1.5) brightness(1.1)' },
  matrix:    { label: 'Matrix',    css: 'hue-rotate(85deg) saturate(3) brightness(0.75) contrast(1.4)' },
};

export default function EffectsRack({ effects, onUpdate, onReset, videoFilter, setVideoFilter }) {
  return (
    <div className="flex flex-col gap-6">

      {/* Audio Effects */}
      <div className="card-bg rounded p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold flex items-center gap-2 uppercase tracking-wider text-sm">
            <Music size={16} /> Audio Effects Chain
          </h3>
          <button onClick={onReset} className="text-xs opacity-50 hover:opacity-80 flex items-center gap-1 transition-opacity studio-btn btn-inactive px-2 py-1 rounded">
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        {/* Gain */}
        <div className="mb-5">
          <div className="text-xs opacity-40 uppercase tracking-widest mb-3">Input / Output</div>
          <div className="grid grid-cols-2 gap-6">
            <Knob label="Input Gain" value={effects.inputGain} min={0} max={2} step={0.01} onChange={v => onUpdate('inputGain', v)} unit="×" />
            <Knob label="Output Gain" value={effects.outputGain} min={0} max={2} step={0.01} onChange={v => onUpdate('outputGain', v)} unit="×" />
          </div>
        </div>

        <div className="divider-line mb-5" />

        {/* EQ */}
        <div className="mb-5">
          <div className="text-xs opacity-40 uppercase tracking-widest mb-3">3-Band EQ</div>
          <div className="grid grid-cols-3 gap-4">
            <Knob label="Bass" value={effects.bass} min={-20} max={20} step={0.5} onChange={v => onUpdate('bass', v)} unit="dB" color="#ff8c00" />
            <Knob label="Mid" value={effects.mid} min={-20} max={20} step={0.5} onChange={v => onUpdate('mid', v)} unit="dB" color="#00ff88" />
            <Knob label="Treble" value={effects.treble} min={-20} max={20} step={0.5} onChange={v => onUpdate('treble', v)} unit="dB" color="#00f3ff" />
          </div>
        </div>

        <div className="divider-line mb-5" />

        {/* Compressor */}
        <div className="mb-5">
          <div className="text-xs opacity-40 uppercase tracking-widest mb-3">Dynamics Compressor</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
            <Toggle label="Enable" checked={effects.compressionOn} onChange={v => onUpdate('compressionOn', v)} />
            <Knob label="Threshold" value={effects.compThreshold} min={-60} max={0} step={1} onChange={v => onUpdate('compThreshold', v)} unit="dB" />
            <Knob label="Ratio" value={effects.compRatio} min={1} max={20} step={0.5} onChange={v => onUpdate('compRatio', v)} unit=":1" />
            <Knob label="Release" value={effects.compRelease} min={0.01} max={1} step={0.01} onChange={v => onUpdate('compRelease', v)} unit="s" />
          </div>
        </div>

        <div className="divider-line mb-5" />

        {/* Reverb & Delay */}
        <div>
          <div className="text-xs opacity-40 uppercase tracking-widest mb-3">Reverb & Delay</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Knob label="Reverb" value={effects.reverbAmount} min={0} max={1} step={0.01} onChange={v => onUpdate('reverbAmount', v)} />
            <Knob label="Delay Mix" value={effects.delayAmount} min={0} max={1} step={0.01} onChange={v => onUpdate('delayAmount', v)} />
            <Knob label="Delay Time" value={effects.delayTime} min={0.05} max={1} step={0.01} onChange={v => onUpdate('delayTime', v)} unit="s" />
          </div>
        </div>
      </div>

      {/* Video Effects */}
      <div className="card-bg rounded p-5">
        <h3 className="font-bold flex items-center gap-2 uppercase tracking-wider text-sm mb-4">
          <Video size={16} /> Video Filter Presets
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(VIDEO_FILTERS).map(([key, { label, css }]) => (
            <button
              key={key}
              onClick={() => setVideoFilter(key)}
              className={`relative rounded overflow-hidden h-20 flex items-end p-2 transition-all ${videoFilter === key ? 'ring-2 ring-current' : 'opacity-60 hover:opacity-90'}`}
              style={{ background: '#111' }}
            >
              {/* Filter preview strip */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  filter: css,
                }}
              />
              <span className="relative z-10 text-xs font-bold text-white drop-shadow">{label}</span>
              {videoFilter === key && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-current" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs opacity-30 mt-3">Filters apply to the live preview and will be visible in the recording when using screen capture mode. For camera recording, apply filters post-production.</p>
      </div>

      {/* Note */}
      <div className="p-3 rounded text-xs opacity-50" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Sliders size={12} className="inline mr-1" />
        Audio effects process the live stream in real-time via Web Audio API. Start a preview first to activate the effects chain.
      </div>
    </div>
  );
}
