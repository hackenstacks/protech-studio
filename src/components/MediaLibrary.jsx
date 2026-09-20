import { useState, useRef } from 'react';
import { Download, Trash2, Play, X, FileAudio, FileVideo, Monitor, Clock, HardDrive, Calendar } from 'lucide-react';
import { formatDuration, formatSize } from '../hooks/useMediaRecorder';

const TYPE_ICONS = {
  audio:  <FileAudio size={20} />,
  video:  <FileVideo size={20} />,
  av:     <FileVideo size={20} />,
  screen: <Monitor size={20} />,
};

const TYPE_COLORS = {
  audio:  '#ff8c00',
  video:  '#00f3ff',
  av:     '#00ff88',
  screen: '#b47eff',
};

function RecordingModal({ rec, onClose }) {
  const isAudio = rec.type === 'audio';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="card-bg rounded-xl p-4 max-w-3xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ color: TYPE_COLORS[rec.type] }}>{TYPE_ICONS[rec.type]}</span>
            <span className="font-bold text-sm">{rec.name}</span>
          </div>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
            <X size={20} />
          </button>
        </div>
        {isAudio ? (
          <audio src={rec.url} controls className="w-full" style={{ filter: 'invert(0)' }} />
        ) : (
          <video
            src={rec.url}
            controls
            className="w-full rounded"
            style={{ maxHeight: '60vh', background: '#000' }}
          />
        )}
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs opacity-50 text-center">
          <div>{formatDuration(rec.duration)}</div>
          <div>{formatSize(rec.size)}</div>
          <div>{new Date(rec.date).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function MediaLibrary({ recordings, onDelete, onDownload }) {
  const [playing, setPlaying] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? recordings
    : recordings.filter(r => r.type === filter);

  const totalSize = recordings.reduce((a, r) => a + r.size, 0);
  const types = [...new Set(recordings.map(r => r.type))];

  return (
    <div className="flex flex-col gap-4">

      {/* Stats bar */}
      {recordings.length > 0 && (
        <div className="card-bg rounded p-3 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-1.5 opacity-60">
            <FileVideo size={14} />
            <span>{recordings.length} recording{recordings.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <HardDrive size={14} />
            <span>{formatSize(totalSize)}</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <Clock size={14} />
            <span>{formatDuration(recordings.reduce((a, r) => a + r.duration, 0))} total</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {recordings.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {['all', ...types].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all studio-btn ${filter === t ? 'btn-active' : 'btn-inactive'}`}
            >
              {t === 'all' ? `All (${recordings.length})` : `${t} (${recordings.filter(r => r.type === t).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {recordings.length === 0 && (
        <div className="card-bg rounded p-16 flex flex-col items-center justify-center gap-4 opacity-50">
          <FileVideo size={48} className="opacity-30" />
          <div className="text-center">
            <p className="font-bold">No recordings yet</p>
            <p className="text-sm opacity-60 mt-1">Hit REC in the Studio tab to start capturing</p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(rec => (
          <div
            key={rec.id}
            className="card-bg rounded-lg overflow-hidden hover:brightness-110 transition-all group"
          >
            {/* Thumbnail / Preview area */}
            <div
              className="relative flex items-center justify-center cursor-pointer"
              style={{ height: '120px', background: '#080818', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              onClick={() => setPlaying(rec)}
            >
              {rec.type !== 'audio' ? (
                <video
                  src={rec.url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <FileAudio size={36} style={{ color: TYPE_COLORS[rec.type], opacity: 0.5 }} />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <Play size={32} style={{ color: TYPE_COLORS[rec.type] }} />
              </div>
              {/* Type badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: TYPE_COLORS[rec.type] }}>
                {TYPE_ICONS[rec.type]}
                {rec.type.toUpperCase()}
              </div>
              {/* Duration badge */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(0,0,0,0.7)' }}>
                {formatDuration(rec.duration)}
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="font-medium text-sm truncate mb-1" title={rec.name}>{rec.name}</div>
              <div className="flex items-center gap-3 text-xs opacity-40">
                <span className="flex items-center gap-1"><Calendar size={10} />{new Date(rec.date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><HardDrive size={10} />{formatSize(rec.size)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => setPlaying(rec)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold studio-btn btn-secondary"
              >
                <Play size={12} /> Play
              </button>
              <button
                onClick={() => onDownload(rec)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold studio-btn btn-secondary"
              >
                <Download size={12} /> Save
              </button>
              <button
                onClick={() => onDelete(rec.id)}
                className="px-3 py-1.5 rounded text-xs font-bold studio-btn btn-danger"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Playback modal */}
      {playing && <RecordingModal rec={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
