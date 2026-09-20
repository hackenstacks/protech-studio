import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Video, Monitor, AudioLines, Camera, StopCircle,
  Pause, Play, Circle, Settings, ChevronDown, AlertCircle, Loader
} from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { formatDuration, formatSize } from '../hooks/useMediaRecorder';

const QUALITY_PRESETS = {
  low:    { label: 'Low',    width: 640,  height: 360,  frameRate: 24, videoBitrate: 800_000,  audioBitrate: 64_000,  sampleRate: 44100 },
  medium: { label: 'Medium', width: 1280, height: 720,  frameRate: 30, videoBitrate: 2_500_000, audioBitrate: 128_000, sampleRate: 48000 },
  high:   { label: 'High',   width: 1920, height: 1080, frameRate: 30, videoBitrate: 8_000_000, audioBitrate: 192_000, sampleRate: 48000 },
  ultra:  { label: 'Ultra',  width: 2560, height: 1440, frameRate: 60, videoBitrate: 20_000_000, audioBitrate: 320_000, sampleRate: 48000 },
};

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

const MODES = [
  { id: 'av',     label: 'A+V',    icon: <Camera size={16} />,     desc: 'Audio + Video' },
  { id: 'audio',  label: 'Audio',  icon: <Mic size={16} />,        desc: 'Audio only' },
  { id: 'video',  label: 'Video',  icon: <Video size={16} />,      desc: 'Video only' },
  { id: 'screen', label: 'Screen', icon: <Monitor size={16} />,    desc: 'Screen capture' },
];

export default function RecordingStudio({
  studio,          // { isRecording, isPaused, duration, error, activeStream, devices, isLoadingStream, formattedDuration }
  onStartPreview,  // fn(mode, deviceIds, quality) → stream
  onStartRecording,// fn(stream, mode, quality) → bool
  onStop,
  onPause,
  analyserRef,
  videoFilter,
  setVideoFilter,
}) {
  const [mode, setMode] = useState('av');
  const [quality, setQuality] = useState('medium');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [vizMode, setVizMode] = useState('bars');

  const videoRef = useRef(null);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && studio.activeStream) {
      videoRef.current.srcObject = studio.activeStream;
      videoRef.current.play().catch(() => {});
    }
  }, [studio.activeStream]);

  const handlePreview = useCallback(async () => {
    const q = QUALITY_PRESETS[quality];
    await onStartPreview(mode, { audio: selectedAudio, video: selectedVideo }, q);
  }, [mode, quality, selectedAudio, selectedVideo, onStartPreview]);

  const handleRecord = useCallback(async () => {
    let stream = studio.activeStream;
    if (!stream) {
      stream = await onStartPreview(mode, { audio: selectedAudio, video: selectedVideo }, QUALITY_PRESETS[quality]);
    }
    if (stream) {
      onStartRecording(stream, mode, QUALITY_PRESETS[quality]);
    }
  }, [studio.activeStream, mode, selectedAudio, selectedVideo, quality, onStartPreview, onStartRecording]);

  const isAudioMode = mode === 'audio';
  const hasStream = !!studio.activeStream;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            disabled={studio.isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-sm transition-all studio-btn ${mode === m.id ? 'btn-active' : 'btn-inactive'}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
        <button
          onClick={() => setShowSettings(s => !s)}
          className="ml-auto px-3 py-2 rounded studio-btn btn-inactive flex items-center gap-1 text-sm"
        >
          <Settings size={15} /> Settings
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="card-bg rounded p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Quality */}
          <div>
            <label className="block opacity-60 mb-1 uppercase text-xs tracking-wider">Quality</label>
            <select
              value={quality}
              onChange={e => setQuality(e.target.value)}
              disabled={studio.isRecording}
              className="w-full p-2 rounded studio-select"
            >
              {Object.entries(QUALITY_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label} — {v.width}×{v.height}</option>
              ))}
            </select>
          </div>

          {/* Audio device */}
          {mode !== 'video' && (
            <div>
              <label className="block opacity-60 mb-1 uppercase text-xs tracking-wider">Microphone</label>
              <select
                value={selectedAudio}
                onChange={e => setSelectedAudio(e.target.value)}
                disabled={studio.isRecording}
                className="w-full p-2 rounded studio-select"
              >
                <option value="">Default</option>
                {studio.devices.audio.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic ' + d.deviceId.slice(0, 6)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Video device */}
          {mode !== 'audio' && mode !== 'screen' && (
            <div>
              <label className="block opacity-60 mb-1 uppercase text-xs tracking-wider">Camera</label>
              <select
                value={selectedVideo}
                onChange={e => setSelectedVideo(e.target.value)}
                disabled={studio.isRecording}
                className="w-full p-2 rounded studio-select"
              >
                <option value="">Default</option>
                {studio.devices.video.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera ' + d.deviceId.slice(0, 6)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Video filter */}
          {mode !== 'audio' && (
            <div>
              <label className="block opacity-60 mb-1 uppercase text-xs tracking-wider">Video Filter</label>
              <select
                value={videoFilter}
                onChange={e => setVideoFilter(e.target.value)}
                className="w-full p-2 rounded studio-select"
              >
                {Object.entries(VIDEO_FILTERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {studio.error && (
        <div className="flex items-center gap-2 p-3 rounded text-sm" style={{ background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.4)' }}>
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span className="text-red-300">{studio.error}</span>
        </div>
      )}

      {/* Main preview */}
      <div className="relative rounded overflow-hidden preview-area flex-1" style={{ minHeight: '280px' }}>
        {isAudioMode ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${studio.isRecording && !studio.isPaused ? 'animate-pulse' : ''}`}
              style={{ background: studio.isRecording ? 'rgba(255,60,60,0.25)' : 'rgba(0,243,255,0.1)', border: '2px solid currentColor', boxShadow: studio.isRecording ? '0 0 30px rgba(255,60,60,0.4)' : undefined }}>
              <Mic size={40} />
            </div>
            <p className="opacity-50 text-sm">{studio.isRecording ? 'Recording audio...' : 'Audio only mode'}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: VIDEO_FILTERS[videoFilter]?.css || 'none',
              background: '#000',
            }}
          />
        )}

        {/* Overlays */}
        {!hasStream && !studio.isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 preview-overlay">
            <Camera size={48} className="opacity-20" />
            <p className="opacity-40 text-sm">Click Preview or Record to start</p>
          </div>
        )}

        {studio.isLoadingStream && (
          <div className="absolute inset-0 flex items-center justify-center preview-overlay">
            <Loader size={32} className="animate-spin opacity-60" />
          </div>
        )}

        {/* Recording indicator */}
        {studio.isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,60,60,0.6)' }}>
            <span className={`w-2 h-2 rounded-full bg-red-500 ${studio.isPaused ? '' : 'animate-pulse'}`} />
            {studio.isPaused ? 'PAUSED' : 'REC'} · {studio.formattedDuration}
          </div>
        )}

        {/* Filter label */}
        {videoFilter !== 'normal' && hasStream && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {VIDEO_FILTERS[videoFilter]?.label}
          </div>
        )}
      </div>

      {/* Waveform */}
      <div className="card-bg rounded p-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs opacity-40 uppercase tracking-wider">Audio Level</span>
          <button
            onClick={() => setVizMode(v => v === 'bars' ? 'wave' : 'bars')}
            className="text-xs opacity-40 hover:opacity-70 transition-opacity"
          >
            {vizMode === 'bars' ? 'Bars' : 'Wave'}
          </button>
        </div>
        <WaveformVisualizer
          analyser={analyserRef}
          isActive={hasStream && !studio.isPaused}
          mode={vizMode}
          height={64}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Preview */}
        {!studio.isRecording && (
          <button
            onClick={hasStream ? undefined : handlePreview}
            disabled={studio.isLoadingStream}
            className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm transition-all studio-btn ${hasStream ? 'btn-active' : 'btn-secondary'}`}
          >
            {studio.isLoadingStream ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
            {hasStream ? 'Live' : 'Preview'}
          </button>
        )}

        {/* Record */}
        <button
          onClick={studio.isRecording ? onStop : handleRecord}
          disabled={studio.isLoadingStream}
          className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold text-sm transition-all studio-btn ${studio.isRecording ? 'btn-stop' : 'btn-record'}`}
        >
          {studio.isRecording
            ? <><StopCircle size={16} /> STOP</>
            : <><Circle size={16} className="fill-current" /> REC</>
          }
        </button>

        {/* Pause */}
        {studio.isRecording && (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-4 py-2.5 rounded font-bold text-sm studio-btn btn-inactive"
          >
            {studio.isPaused ? <><Play size={16} /> RESUME</> : <><Pause size={16} /> PAUSE</>}
          </button>
        )}

        {/* Timer */}
        {studio.isRecording && (
          <div className="ml-auto font-mono text-lg font-bold tracking-widest timer-display">
            {studio.formattedDuration}
          </div>
        )}

        {/* Quality badge */}
        {!studio.isRecording && (
          <div className="ml-auto text-xs opacity-40 uppercase tracking-wider">
            {QUALITY_PRESETS[quality].label} · {QUALITY_PRESETS[quality].width}×{QUALITY_PRESETS[quality].height}
          </div>
        )}
      </div>
    </div>
  );
}
