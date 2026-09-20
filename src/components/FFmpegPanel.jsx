import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Film, Image, Music, Scissors, Repeat, Download, Upload, X, ChevronRight } from 'lucide-react';

const MODES = [
  { id: 'frames',  label: 'Frame Extract', icon: <Image size={14} /> },
  { id: 'gif',     label: 'GIF Maker',     icon: <Repeat size={14} /> },
  { id: 'convert', label: 'Convert',       icon: <Film size={14} /> },
  { id: 'audio',   label: 'Extract Audio', icon: <Music size={14} /> },
  { id: 'trim',    label: 'Trim',          icon: <Scissors size={14} /> },
];

const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

export default function FFmpegPanel() {
  const ffmpegRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState('frames');
  const [file, setFile] = useState(null);
  const [frames, setFrames] = useState([]);
  const [outputURL, setOutputURL] = useState(null);
  const [outputName, setOutputName] = useState('');
  const [fps, setFps] = useState(4);
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('8');
  const [convertFmt, setConvertFmt] = useState('webm');
  const dropRef = useRef(null);

  const loadFFmpeg = async () => {
    if (loaded) return;
    setLoading(true);
    setStatus('Loading ffmpeg core (~31MB, one-time)…');
    try {
      const ff = new FFmpeg();
      ff.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)));
      ff.on('log', ({ message }) => setStatus(message));
      await ff.load({
        coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ff;
      setLoaded(true);
      setStatus('ffmpeg ready');
    } catch (e) {
      setStatus('Load failed: ' + e.message);
    }
    setLoading(false);
  };

  const pickFile = useCallback((f) => {
    setFile(f);
    setFrames([]);
    setOutputURL(null);
    setStatus(`Loaded: ${f.name}`);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, [pickFile]);

  const onInput = (e) => { if (e.target.files[0]) pickFile(e.target.files[0]); };

  const clearOutput = () => {
    setFrames([]);
    setOutputURL(null);
    setOutputName('');
    setProgress(0);
  };

  const run = async () => {
    if (!file || !ffmpegRef.current) return;
    clearOutput();
    const ff = ffmpegRef.current;
    const ext = file.name.split('.').pop();
    const input = `input.${ext}`;
    setStatus('Writing file…');
    await ff.writeFile(input, await fetchFile(file));

    if (mode === 'frames') {
      setStatus('Extracting frames…');
      await ff.exec(['-i', input, '-vf', `fps=${fps}`, '-f', 'image2', 'frame_%04d.png']);
      const results = [];
      let i = 1;
      while (true) {
        const name = `frame_${String(i).padStart(4, '0')}.png`;
        try {
          const data = await ff.readFile(name);
          const blob = new Blob([data.buffer], { type: 'image/png' });
          results.push({ url: URL.createObjectURL(blob), name });
          await ff.deleteFile(name);
          i++;
        } catch { break; }
      }
      setFrames(results);
      setStatus(`${results.length} frames extracted`);

    } else if (mode === 'gif') {
      setStatus('Generating GIF…');
      await ff.exec([
        '-i', input,
        '-vf', `fps=${fps},scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        '-loop', '0', 'out.gif',
      ]);
      const data = await ff.readFile('out.gif');
      const blob = new Blob([data.buffer], { type: 'image/gif' });
      setOutputURL(URL.createObjectURL(blob));
      setOutputName(file.name.replace(/\.[^.]+$/, '.gif'));
      setStatus('GIF ready');

    } else if (mode === 'convert') {
      setStatus(`Converting to ${convertFmt}…`);
      const out = `out.${convertFmt}`;
      const mime = convertFmt === 'webm' ? 'video/webm' : convertFmt === 'mp4' ? 'video/mp4' : 'video/ogg';
      await ff.exec(['-i', input, out]);
      const data = await ff.readFile(out);
      const blob = new Blob([data.buffer], { type: mime });
      setOutputURL(URL.createObjectURL(blob));
      setOutputName(file.name.replace(/\.[^.]+$/, `.${convertFmt}`));
      setStatus(`Converted to ${convertFmt}`);

    } else if (mode === 'audio') {
      setStatus('Extracting audio…');
      await ff.exec(['-i', input, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'out.mp3']);
      const data = await ff.readFile('out.mp3');
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
      setOutputURL(URL.createObjectURL(blob));
      setOutputName(file.name.replace(/\.[^.]+$/, '.mp3'));
      setStatus('Audio extracted');

    } else if (mode === 'trim') {
      setStatus('Trimming…');
      const out = `trimmed.${ext}`;
      await ff.exec(['-i', input, '-ss', startTime, '-to', endTime, '-c', 'copy', out]);
      const data = await ff.readFile(out);
      const blob = new Blob([data.buffer], { type: file.type || 'video/mp4' });
      setOutputURL(URL.createObjectURL(blob));
      setOutputName(`trimmed_${file.name}`);
      setStatus('Trim complete');
    }

    await ff.deleteFile(input);
    setProgress(0);
  };

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="card-bg rounded p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={15} className="opacity-60" />
          <span className="text-sm font-bold opacity-70 uppercase tracking-wider">FFmpeg</span>
          <span className="text-xs opacity-30">· Fabrice Bellard's gift to the world</span>
        </div>
        {!loaded && (
          <button
            onClick={loadFFmpeg}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold studio-btn btn-active"
          >
            {loading ? <span className="animate-pulse">Loading…</span> : <><ChevronRight size={12} /> Load Engine</>}
          </button>
        )}
        {loaded && <span className="text-xs" style={{ color: 'var(--accent)' }}>● Engine Ready</span>}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 flex-wrap">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); clearOutput(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold studio-btn ${mode === m.id ? 'btn-active' : 'btn-inactive'}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">

        {/* Left: Drop + Controls */}
        <div className="flex flex-col gap-3">

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className="card-bg rounded p-6 text-center cursor-pointer flex flex-col items-center gap-3"
            style={{ border: '2px dashed var(--border)', minHeight: 140 }}
            onClick={() => document.getElementById('ff-file-input').click()}
          >
            <Upload size={28} className="opacity-30" />
            <p className="text-xs opacity-50">Drop video here or click to browse</p>
            {file && <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{file.name}</p>}
            <input id="ff-file-input" type="file" accept="video/*,audio/*" className="hidden" onChange={onInput} />
          </div>

          {/* Mode-specific controls */}
          <div className="card-bg rounded p-3 flex flex-col gap-3">
            {(mode === 'frames' || mode === 'gif') && (
              <div>
                <label className="text-xs opacity-50 block mb-1">FPS (frames per second)</label>
                <input
                  type="range" min="1" max="30" value={fps}
                  onChange={e => setFps(Number(e.target.value))}
                  className="w-full accent-current"
                />
                <span className="text-xs opacity-70">{fps} fps</span>
              </div>
            )}

            {mode === 'trim' && (
              <>
                <div>
                  <label className="text-xs opacity-50 block mb-1">Start (seconds)</label>
                  <input
                    type="number" min="0" value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full rounded px-2 py-1 text-xs"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="text-xs opacity-50 block mb-1">End (seconds)</label>
                  <input
                    type="number" min="0" value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full rounded px-2 py-1 text-xs"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </>
            )}

            {mode === 'convert' && (
              <div>
                <label className="text-xs opacity-50 block mb-1">Output format</label>
                <select
                  value={convertFmt}
                  onChange={e => setConvertFmt(e.target.value)}
                  className="w-full rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="webm">WebM</option>
                  <option value="mp4">MP4</option>
                  <option value="ogv">OGV</option>
                </select>
              </div>
            )}

            <button
              onClick={run}
              disabled={!loaded || !file}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold studio-btn btn-active disabled:opacity-30"
            >
              <ChevronRight size={13} /> Run
            </button>
          </div>

          {/* Status */}
          {(status || progress > 0) && (
            <div className="card-bg rounded p-3">
              <p className="text-xs opacity-60 truncate">{status}</p>
              {progress > 0 && (
                <div className="mt-2 h-1 rounded overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Output */}
        <div className="md:col-span-2 card-bg rounded p-3 overflow-auto" style={{ minHeight: 400 }}>

          {/* Single file output (GIF, convert, audio, trim) */}
          {outputURL && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-70">{outputName}</span>
                <div className="flex gap-2">
                  <a
                    href={outputURL}
                    download={outputName}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold studio-btn btn-active"
                  >
                    <Download size={12} /> Download
                  </a>
                  <button onClick={clearOutput} className="p-1.5 rounded studio-btn btn-inactive">
                    <X size={12} />
                  </button>
                </div>
              </div>
              {mode === 'gif' && <img src={outputURL} alt="output gif" className="rounded max-w-full" />}
              {mode === 'audio' && <audio controls src={outputURL} className="w-full" />}
              {(mode === 'convert' || mode === 'trim') && (
                <video controls src={outputURL} className="w-full rounded" style={{ maxHeight: 400 }} />
              )}
            </div>
          )}

          {/* Frame grid */}
          {frames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs opacity-50">{frames.length} frames @ {fps}fps</span>
                <button onClick={clearOutput} className="p-1.5 rounded studio-btn btn-inactive"><X size={12} /></button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {frames.map((f, i) => (
                  <div key={i} className="relative group rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={f.url} alt={f.name} className="w-full block" />
                    <a
                      href={f.url}
                      download={f.name}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <Download size={20} style={{ color: 'var(--accent)' }} />
                    </a>
                    <span className="absolute bottom-1 left-1 text-xs px-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--accent)' }}>
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!outputURL && frames.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-sm gap-2">
              <Film size={40} />
              <p>Output appears here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
