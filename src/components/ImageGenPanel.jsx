import { useState } from 'react';
import { Image, Download, Loader, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'protech_ai_config';

const STYLES = [
  { name: 'None',          keywords: '' },
  { name: 'Photorealistic', keywords: 'photorealistic, 8k, detailed, professional photography' },
  { name: 'Cinematic',     keywords: 'cinematic, movie still, dramatic lighting, high detail' },
  { name: 'Anime',         keywords: 'anime style, cel shaded, vibrant colors, detailed' },
  { name: 'Digital Art',   keywords: 'digital painting, concept art, fantasy, intricate' },
  { name: 'Cyberpunk',     keywords: 'cyberpunk, neon lighting, futuristic, dystopian' },
  { name: 'NeXuS Dark',    keywords: 'dark aesthetic, monochrome, neon accents, tech noir, minimal' },
];

const RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

function loadConfig() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { provider: 'nexus', imageModel: 'flux' };
}

// Resolve width/height from aspect ratio string e.g. "16:9"
function ratioToDims(ratio, base = 1024) {
  const [w, h] = (ratio || '1:1').split(':').map(Number);
  if (!w || !h) return { width: base, height: base };
  return w >= h
    ? { width: base, height: Math.round(base * h / w) }
    : { width: Math.round(base * w / h), height: base };
}

async function generateImage({ provider, imageModel, prompt, ratio }) {
  const { width, height } = ratioToDims(ratio);

  // NeXuS proxy — server-side key injection, no CORS
  // Route: /api/pollinations/image (Vite proxies to https://localhost:8443)
  if (provider === 'nexus' || !provider || provider === 'pollinations') {
    const params = new URLSearchParams({
      prompt,
      model:  imageModel || 'flux',
      width:  String(width),
      height: String(height),
      nologo: 'true',
    });
    const res = await fetch(`/api/pollinations/image?${params}`);
    if (!res.ok) throw new Error(`Image gen error ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // OpenAI-compatible /v1/images/generations (for openai/openrouter providers)
  const cfg = loadConfig();
  const base = (cfg.endpoint || '').replace(/\/v1\/?$/, '');
  const res = await fetch(`${base}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: imageModel || 'dall-e-3',
      prompt,
      n: 1,
      size: `${width}x${height}`,
      response_format: 'url',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image gen error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const item = data.data?.[0];
  return item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
}

export default function ImageGenPanel() {
  const [prompt, setPrompt]         = useState('');
  const [negative, setNegative]     = useState('blurry, low quality, watermark, text');
  const [style, setStyle]           = useState('None');
  const [ratio, setRatio]           = useState('1:1');
  const [imageUrl, setImageUrl]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Enter a prompt.'); return; }
    setLoading(true);
    setError('');
    setImageUrl(null);

    const cfg = loadConfig();
    const styleKw = STYLES.find(s => s.name === style)?.keywords || '';
    const fullPrompt = [prompt, styleKw, negative ? `Avoid: ${negative}` : '']
      .filter(Boolean).join(', ');

    try {
      const url = await generateImage({
        provider:   cfg.provider   || 'nexus',
        imageModel: cfg.imageModel || 'flux',
        prompt:     fullPrompt,
        ratio,
      });
      setImageUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `nexus-gen-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="card-bg rounded p-3 flex items-center gap-2">
        <Image size={15} className="opacity-60" />
        <span className="text-sm font-bold opacity-70 uppercase tracking-wider">Image Gen</span>
        <span className="text-xs opacity-30">· Pollinations / OpenAI-compat</span>
        <span className="text-xs opacity-40 ml-auto">Provider from AI tab settings</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Controls */}
        <div className="flex flex-col gap-3">

          {/* Prompt */}
          <div className="card-bg rounded p-3 flex flex-col gap-2">
            <label className="text-xs opacity-50 uppercase tracking-wider">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={4}
              className="w-full rounded p-2 text-sm resize-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
            />
            <label className="text-xs opacity-50 uppercase tracking-wider">Negative Prompt</label>
            <input
              value={negative}
              onChange={e => setNegative(e.target.value)}
              placeholder="What to avoid..."
              className="w-full rounded p-2 text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
            />
          </div>

          {/* Style */}
          <div className="card-bg rounded p-3 flex flex-col gap-2">
            <label className="text-xs opacity-50 uppercase tracking-wider">Style</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map(s => (
                <button
                  key={s.name}
                  onClick={() => setStyle(s.name)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${style === s.name ? 'tab-active' : 'tab-inactive'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ratio */}
          <div className="card-bg rounded p-3 flex flex-col gap-2">
            <label className="text-xs opacity-50 uppercase tracking-wider">Aspect Ratio</label>
            <div className="flex gap-1.5">
              {RATIOS.map(r => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${ratio === r ? 'tab-active' : 'tab-inactive'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded font-bold text-sm studio-btn btn-active disabled:opacity-40"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Generating…' : 'Generate Image'}
          </button>

          {error && (
            <div className="card-bg rounded p-3 text-xs" style={{ color: 'var(--accent-danger)' }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div
          className="card-bg rounded flex items-center justify-center overflow-hidden"
          style={{ minHeight: '400px', position: 'relative' }}
        >
          {loading && (
            <div className="flex flex-col items-center gap-3 opacity-50">
              <Loader size={32} className="animate-spin" />
              <span className="text-xs">Generating image…</span>
            </div>
          )}
          {!loading && !imageUrl && (
            <div className="flex flex-col items-center gap-2 opacity-20">
              <Image size={48} />
              <span className="text-xs uppercase tracking-wider">Image will appear here</span>
            </div>
          )}
          {imageUrl && (
            <div className="relative group w-full h-full flex items-center justify-center p-2">
              <img
                src={imageUrl}
                alt="Generated"
                className="max-w-full max-h-full object-contain rounded"
              />
              <button
                onClick={handleDownload}
                className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold studio-btn btn-active opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download size={12} /> Download
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
