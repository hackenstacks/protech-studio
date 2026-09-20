import { useState, useRef, useCallback } from 'react';

const makeImpulse = (ctx, duration = 2.5, decay = 3) => {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
};

export const DEFAULT_EFFECTS = {
  inputGain: 1.0,
  bass: 0,
  mid: 0,
  treble: 0,
  compressionOn: false,
  compThreshold: -24,
  compRatio: 4,
  compAttack: 0.003,
  compRelease: 0.25,
  reverbAmount: 0,
  delayAmount: 0,
  delayTime: 0.25,
  outputGain: 1.0,
};

export function useAudioEffects() {
  const [effects, setEffects] = useState(DEFAULT_EFFECTS);
  const [isBuilt, setIsBuilt] = useState(false);

  const ctxRef = useRef(null);
  const nodesRef = useRef({});
  const analyserRef = useRef(null);
  const destRef = useRef(null);

  const updateEffect = useCallback((key, value) => {
    setEffects(prev => {
      const next = { ...prev, [key]: value };
      const n = nodesRef.current;

      // Live-update nodes if chain is built
      if (n.inputGain) {
        switch (key) {
          case 'inputGain':   n.inputGain.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'bass':        n.bass.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'mid':         n.mid.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'treble':      n.treble.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'compThreshold': n.comp.threshold.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'compRatio':   n.comp.ratio.setTargetAtTime(value, ctxRef.current.currentTime, 0.01); break;
          case 'reverbAmount':
            n.reverbWet.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01);
            n.reverbDry.gain.setTargetAtTime(1 - value * 0.7, ctxRef.current.currentTime, 0.01);
            break;
          case 'delayAmount':
            n.delayWet.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01);
            break;
          case 'delayTime':
            n.delay.delayTime.setTargetAtTime(value, ctxRef.current.currentTime, 0.01);
            break;
          case 'outputGain':
            n.outputGain.gain.setTargetAtTime(value, ctxRef.current.currentTime, 0.01);
            break;
        }
      }
      return next;
    });
  }, []);

  const resetEffects = useCallback(() => {
    setEffects(DEFAULT_EFFECTS);
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !n.inputGain) return;
    const t = ctx.currentTime;
    n.inputGain.gain.setTargetAtTime(1.0, t, 0.01);
    n.bass.gain.setTargetAtTime(0, t, 0.01);
    n.mid.gain.setTargetAtTime(0, t, 0.01);
    n.treble.gain.setTargetAtTime(0, t, 0.01);
    n.reverbWet.gain.setTargetAtTime(0, t, 0.01);
    n.reverbDry.gain.setTargetAtTime(1, t, 0.01);
    n.delayWet.gain.setTargetAtTime(0, t, 0.01);
    n.outputGain.gain.setTargetAtTime(1.0, t, 0.01);
  }, []);

  // Build the audio graph for a stream
  // Returns { analyser, destStream } for waveform and recording
  const buildChain = useCallback((stream) => {
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    if (ctx.state === 'suspended') ctx.resume();

    const ef = effects;

    // Source
    const src = ctx.createMediaStreamSource(stream);

    // Input gain
    const inputGain = ctx.createGain();
    inputGain.gain.value = ef.inputGain;

    // EQ
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 250;
    bass.gain.value = ef.bass;

    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1200;
    mid.Q.value = 0.7;
    mid.gain.value = ef.mid;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 6000;
    treble.gain.value = ef.treble;

    // Compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = ef.compThreshold;
    comp.ratio.value = ef.compRatio;
    comp.attack.value = ef.compAttack;
    comp.release.value = ef.compRelease;
    comp.knee.value = 10;

    // Delay
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = ef.delayTime;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.35;
    const delayWet = ctx.createGain();
    delayWet.gain.value = ef.delayAmount;

    // Reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.5, 3);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = ef.reverbAmount;
    const reverbDry = ctx.createGain();
    reverbDry.gain.value = 1 - ef.reverbAmount * 0.7;

    // Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    // Output
    const outputGain = ctx.createGain();
    outputGain.gain.value = ef.outputGain;

    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;

    // Wire the chain:
    // src → inputGain → bass → mid → treble → comp → preFX
    // preFX → reverbDry → outputGain → analyser → dest
    // preFX → convolver → reverbWet → outputGain
    // preFX → delay → delayFeedback (loop) + delayWet → outputGain
    const preFX = ctx.createGain();
    preFX.gain.value = 1;

    src.connect(inputGain);
    inputGain.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(comp);
    comp.connect(preFX);

    // Dry path
    preFX.connect(reverbDry);
    reverbDry.connect(outputGain);

    // Reverb path
    preFX.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(outputGain);

    // Delay path
    preFX.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay); // feedback loop
    delay.connect(delayWet);
    delayWet.connect(outputGain);

    // Final
    outputGain.connect(analyser);
    analyser.connect(dest);

    nodesRef.current = {
      src, inputGain, bass, mid, treble, comp, preFX,
      delay, delayFeedback, delayWet,
      convolver, reverbWet, reverbDry,
      outputGain,
    };

    setIsBuilt(true);
    return { analyser, destStream: dest.stream };
  }, [effects]);

  const destroyChain = useCallback(() => {
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    nodesRef.current = {};
    analyserRef.current = null;
    destRef.current = null;
    setIsBuilt(false);
  }, []);

  return {
    effects, updateEffect, resetEffects,
    buildChain, destroyChain,
    analyser: analyserRef,
    isBuilt,
  };
}
