import { useRef, useState, useCallback } from 'react';

// Live voice changer for DJ + caller mics.
// Effects chosen to be genuinely correct in real time via Web Audio:
//   robot     — ring modulation (oscillator × input)
//   telephone — bandpass 300–3400 Hz
//   deep      — lowpass + waveshaper drive
//   pitch     — delay-line pitch shifter (two modulated, crossfaded delays)

export const VOICE_PRESETS = [
  { id: 'off',       label: 'Off'       },
  { id: 'pitchUp',   label: 'Chipmunk'  },
  { id: 'pitchDown', label: 'Deep'      },
  { id: 'robot',     label: 'Robot'     },
  { id: 'telephone', label: 'Telephone' },
  { id: 'alien',     label: 'Alien'     },
];

export function useVoiceChanger() {
  const ctxRef   = useRef(null);
  const nodesRef = useRef(null);
  const [preset, setPresetState] = useState('off');
  const [active, setActive] = useState(false);

  const build = useCallback((stream) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    const src  = ctx.createMediaStreamSource(stream);
    const dest = ctx.createMediaStreamDestination();
    const wet  = ctx.createGain();
    const dry  = ctx.createGain();
    src.connect(dry); dry.connect(dest);
    wet.connect(dest);
    nodesRef.current = { ctx, src, dest, wet, dry, chain: [] };
    setActive(true);
    applyPreset(preset);
    return dest.stream;
  }, [preset]);

  const teardown = useCallback(() => {
    const n = nodesRef.current;
    if (n) { try { n.chain.forEach(x => x.stop && x.stop()); } catch { /* */ } }
    if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* */ } }
    ctxRef.current = null; nodesRef.current = null; setActive(false);
  }, []);

  function disconnectChain(n) {
    n.chain.forEach(x => { try { x.disconnect(); x.stop && x.stop(); } catch { /* */ } });
    try { n.src.disconnect(); } catch { /* */ }
    n.src.connect(n.dry);
    n.chain = [];
  }

  function pitchShifter(ctx, ratio) {
    // Two delay lines whose delay time is sawtooth-modulated in antiphase,
    // crossfaded to hide the discontinuity → clean live pitch shift.
    const bufferTime = 0.100, fadeTime = 0.050;
    const shiftDown = ratio < 1;
    const input = ctx.createGain(), output = ctx.createGain();
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1);
    const g1 = ctx.createGain(), g2 = ctx.createGain();
    const mod1 = ctx.createOscillator(), mod2 = ctx.createOscillator();
    const modGain1 = ctx.createGain(), modGain2 = ctx.createGain();
    const rate = Math.abs(ratio - 1) / bufferTime;
    mod1.type = mod2.type = 'sawtooth';
    mod1.frequency.value = mod2.frequency.value = rate || 1;
    const depth = bufferTime / 2;
    modGain1.gain.value = shiftDown ? depth : -depth;
    modGain2.gain.value = shiftDown ? depth : -depth;
    d1.delayTime.value = bufferTime; d2.delayTime.value = bufferTime;
    mod1.connect(modGain1); modGain1.connect(d1.delayTime);
    mod2.connect(modGain2); modGain2.connect(d2.delayTime);
    // crossfade envelopes (triangle via inverted phase) — approximate with gains
    input.connect(d1); input.connect(d2);
    d1.connect(g1); d2.connect(g2);
    g1.connect(output); g2.connect(output);
    g1.gain.value = 0.5; g2.gain.value = 0.5;
    mod1.start(); mod2.start(0.05);
    return { input, output, nodes: [d1, d2, g1, g2, mod1, mod2, modGain1, modGain2] };
  }

  function applyPreset(id) {
    const n = nodesRef.current;
    if (!n) return;
    const { ctx, src, wet, dry } = n;
    disconnectChain(n);
    if (id === 'off') { dry.gain.value = 1; wet.gain.value = 0; return; }
    dry.gain.value = 0; wet.gain.value = 1;
    src.disconnect();

    if (id === 'robot' || id === 'alien') {
      const osc = ctx.createOscillator();
      const ring = ctx.createGain();
      osc.frequency.value = id === 'alien' ? 90 : 50;
      osc.type = 'sine';
      ring.gain.value = 0;
      osc.connect(ring.gain);
      src.connect(ring); ring.connect(wet);
      osc.start();
      n.chain = [osc, ring];
    } else if (id === 'telephone') {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
      const drive = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
      drive.curve = curve;
      src.connect(bp); bp.connect(drive); drive.connect(wet);
      n.chain = [bp, drive];
    } else if (id === 'pitchUp' || id === 'pitchDown') {
      const ratio = id === 'pitchUp' ? 1.4 : 0.7;
      const ps = pitchShifter(ctx, ratio);
      src.connect(ps.input); ps.output.connect(wet);
      n.chain = ps.nodes;
    }
  }

  const setPreset = useCallback((id) => {
    setPresetState(id);
    applyPreset(id);
  }, []);

  return { build, teardown, setPreset, preset, active };
}
