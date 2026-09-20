import { useState, useRef, useCallback } from 'react';
import {
  Mic, Cpu, Radio, Library, Brain, Sliders,
  Circle, Zap, Disc3, Terminal, Image, Film
} from 'lucide-react';

import { useMediaRecorder } from './hooks/useMediaRecorder';
import { useAudioEffects } from './hooks/useAudioEffects';

import RecordingStudio from './components/RecordingStudio';
import EffectsRack from './components/EffectsRack';
import StreamingPanel from './components/StreamingPanel';
import MediaLibrary from './components/MediaLibrary';
import AIPanel from './components/AIPanel';
import TerminalPanel from './components/TerminalPanel';
import ImageGenPanel from './components/ImageGenPanel';
import FFmpegPanel from './components/FFmpegPanel';

// --- Plugin Dock ---
import { PLUGIN_REGISTRY, usePluginState, DockBar } from './plugins/PluginEngine';
import { SlidePanel } from './plugins/SlidePanel';
import { NotesPlugin } from './plugins/NotesPlugin';
import { VaultPlugin } from './plugins/VaultPlugin';
import { BookmarksPlugin } from './plugins/BookmarksPlugin';
import { AIPlugin } from './plugins/AIPlugin';
import { RSSPlugin } from './plugins/RSSPlugin';
import { SpiderPlugin } from './plugins/SpiderPlugin';
import { NetworksPlugin } from './plugins/NetworksPlugin';
import { PlatformsPlugin } from './plugins/PlatformsPlugin';
import { EQPlugin } from './plugins/EQPlugin';
import { ControlBoardPlugin } from './plugins/ControlBoardPlugin';
import { RadioPlugin } from './plugins/RadioPlugin';
import { FiresidePlugin } from './plugins/FiresidePlugin';
import { CallInPlugin } from './plugins/CallInPlugin';

const PLUGIN_COMPONENTS = {
  controlboard: ControlBoardPlugin,
  radio:     RadioPlugin,
  fireside:  FiresidePlugin,
  callin:    CallInPlugin,
  notes:     NotesPlugin,
  vault:     VaultPlugin,
  bookmarks: BookmarksPlugin,
  ai:        AIPlugin,
  rss:       RSSPlugin,
  spider:    SpiderPlugin,
  networks:  NetworksPlugin,
  platforms: PlatformsPlugin,
  eq:        EQPlugin,
};

// --- Theme Config ---
const THEMES = {
  TRON:     'theme-tron',
  MATRIX:   'theme-matrix',
  STANDARD: 'theme-standard',
};

const THEME_ORDER = ['TRON', 'MATRIX', 'STANDARD'];

const AI_MODELS = [
  { id: 'gemini-2.0-flash',       label: 'Flash 2.0',  desc: 'Fast' },
  { id: 'gemini-2.5-pro-preview', label: 'Pro 2.5',    desc: 'Deep Think' },
];

const TABS = [
  { id: 'studio',  label: 'Studio',  icon: <Mic size={16} /> },
  { id: 'effects', label: 'Effects', icon: <Sliders size={16} /> },
  { id: 'stream',  label: 'Stream',  icon: <Radio size={16} /> },
  { id: 'library', label: 'Library', icon: <Library size={16} /> },
  { id: 'ai',       label: 'AI',       icon: <Brain size={16} /> },
  { id: 'imagegen', label: 'Image',    icon: <Image size={16} /> },
  { id: 'ffmpeg',   label: 'FFmpeg',   icon: <Film size={16} /> },
  { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
];

export default function ProTechStudio() {
  const [themeKey, setThemeKey] = useState('TRON');
  const [activeTab, setActiveTab] = useState('studio');
  const [modelIdx, setModelIdx] = useState(0);
  const [videoFilter, setVideoFilter] = useState('normal');
  const [angusIsBowing, setAngusIsBowing] = useState(false);

  const studio = useMediaRecorder();
  const audioFX = useAudioEffects();
  const plugins = usePluginState();

  const analyserRef = useRef(null);
  // Pass audioFX analyser if built, else a null ref
  const effectsAnalyserRef = audioFX.analyser;

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(themeKey);
    setThemeKey(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  };

  const cycleModel = () => setModelIdx(i => (i + 1) % AI_MODELS.length);

  // When preview starts, optionally build audio effects chain
  const handleStartPreview = useCallback(async (mode, deviceIds, quality) => {
    const stream = await studio.startPreview(mode, deviceIds, quality);
    if (stream && (mode === 'audio' || mode === 'av')) {
      // Build audio effects chain
      const { analyser, destStream } = audioFX.buildChain(stream);
      // Note: for effects-processed recording, destStream would be used
      // For simplicity we use the raw stream for recording and effects for monitoring
    }
    return stream;
  }, [studio, audioFX]);

  const handleStartRecording = useCallback((stream, mode, quality) => {
    return studio.startRecording(stream, mode, quality);
  }, [studio]);

  const handleStop = useCallback(() => {
    studio.stopRecording();
  }, [studio]);

  const handlePause = useCallback(() => {
    studio.pauseRecording();
  }, [studio]);

  const currentModel = AI_MODELS[modelIdx];
  const themeClass = THEMES[themeKey];

  // Recording count badge
  const recCount = studio.recordings.length;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${themeClass}`}>

      {/* ──────────── HEADER ──────────── */}
      <header className="sticky top-0 z-40 px-6 py-3 flex items-center gap-4 flex-wrap header-bar">

        {/* Logo */}
        <div className="flex items-center gap-3 mr-2">
          <div
            className="relative cursor-pointer select-none"
            onClick={() => setAngusIsBowing(b => !b)}
            title={angusIsBowing ? 'Stand up, Angus!' : 'Take a bow, Angus!'}
          >
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: angusIsBowing
                  ? 'rotate(50deg) scaleY(0.65)'
                  : 'rotate(0deg) scaleY(1)',
                transformOrigin: 'bottom center',
              }}
            >
              <Disc3
                size={28}
                className={studio.isRecording ? 'animate-spin' : ''}
                style={{ animationDuration: '3s', display: 'block' }}
              />
            </span>
            {studio.isRecording && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            )}
            {angusIsBowing && (
              <span
                className="absolute -bottom-3 left-1/2 text-xs"
                style={{ transform: 'translateX(-50%)', fontSize: '10px', opacity: 0.6 }}
              >
                🎸
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">ProTech Studio</h1>
            <p className="text-xs opacity-40 tracking-widest leading-none mt-0.5">LiVeWiRe</p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 flex-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all relative ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'library' && recCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                  {recCount > 9 ? '9+' : recCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Recording pulse */}
          {studio.isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}>
              <Circle size={10} className="fill-red-500 text-red-500 animate-pulse" />
              {studio.formattedDuration}
            </div>
          )}

          {/* Model selector */}
          <button
            onClick={cycleModel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold header-btn"
          >
            <Cpu size={13} />
            <span className="hidden md:inline">{currentModel.label}</span>
            <span className="opacity-50 hidden md:inline">· {currentModel.desc}</span>
          </button>

          {/* Theme */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold header-btn"
          >
            <Zap size={13} />
            <span className="hidden md:inline">LIVEWIRE</span>
            <span className="opacity-40 hidden md:inline">· {themeKey}</span>
          </button>
        </div>
      </header>

      {/* ──────────── MAIN CONTENT ──────────── */}
      <main className="flex-1 px-4 md:px-6 py-5 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          {activeTab === 'studio' && (
            <RecordingStudio
              studio={studio}
              onStartPreview={handleStartPreview}
              onStartRecording={handleStartRecording}
              onStop={handleStop}
              onPause={handlePause}
              analyserRef={effectsAnalyserRef}
              videoFilter={videoFilter}
              setVideoFilter={setVideoFilter}
            />
          )}

          {activeTab === 'effects' && (
            <EffectsRack
              effects={audioFX.effects}
              onUpdate={audioFX.updateEffect}
              onReset={audioFX.resetEffects}
              videoFilter={videoFilter}
              setVideoFilter={setVideoFilter}
            />
          )}

          {activeTab === 'stream' && (
            <StreamingPanel
              studio={studio}
              recordings={studio.recordings}
            />
          )}

          {activeTab === 'library' && (
            <MediaLibrary
              recordings={studio.recordings}
              onDelete={studio.deleteRecording}
              onDownload={studio.downloadRecording}
            />
          )}

          {activeTab === 'ai' && (
            <AIPanel
              recordings={studio.recordings}
              activeStream={studio.activeStream}
            />
          )}

          {activeTab === 'imagegen' && (
            <ImageGenPanel />
          )}

          {activeTab === 'ffmpeg' && (
            <FFmpegPanel />
          )}

          {activeTab === 'terminal' && (
            <TerminalPanel />
          )}

        </div>
      </main>

      {/* ──────────── STATUS BAR ──────────── */}
      <footer className="px-6 py-2 flex items-center gap-4 text-xs opacity-40 status-bar">
        <span>LiVeWiRe · ProTech Studio v2.0</span>
        <span>·</span>
        <span>{studio.recordings.length} recording{studio.recordings.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{themeKey} theme</span>
        <span>·</span>
        <span>{currentModel.label}</span>
        <span className="ml-auto">WebRTC · MediaRecorder API · Web Audio API</span>
      </footer>

      {/* ──────────── PLUGIN SLIDE PANELS ──────────── */}
      {PLUGIN_REGISTRY.map(({ id, label, slideFrom }) => {
        const PluginComp = PLUGIN_COMPONENTS[id];
        return (
          <SlidePanel
            key={id}
            id={id}
            title={label}
            slideFrom={slideFrom}
            isOpen={plugins.isOpen(id)}
            onClose={() => plugins.close(id)}
          >
            <PluginComp plugins={plugins} />
          </SlidePanel>
        );
      })}

      {/* ──────────── DOCK BAR ──────────── */}
      <DockBar pluginState={plugins} />
    </div>
  );
}
