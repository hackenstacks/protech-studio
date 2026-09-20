import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Mic, MicOff, Send, Settings, Loader, Copy, FileText, Sparkles, Bot, User, ChevronDown, ChevronUp, BarChart2, AlertTriangle } from 'lucide-react';

// ─── Token Pricing (per 1M tokens) ────────────────────────────────────────────
// Input / Output USD rates. Update as Google changes pricing.
const PRICING = {
  // Gemini
  'gemini-2.5-pro-preview-06-05':      { in: 1.25,  out: 10.00 },
  'gemini-2.5-pro':                    { in: 1.25,  out: 10.00 },
  'gemini-2.5-flash-preview-05-20':    { in: 0.15,  out: 0.60  },
  'gemini-2.5-flash':                  { in: 0.15,  out: 0.60  },
  'gemini-2.0-flash':                  { in: 0.10,  out: 0.40  },
  'gemini-1.5-pro':                    { in: 1.25,  out: 5.00  },
  'gemini-1.5-flash':                  { in: 0.075, out: 0.30  },
  // OpenAI
  'gpt-4o':                            { in: 2.50,  out: 10.00 },
  'gpt-4o-mini':                       { in: 0.15,  out: 0.60  },
  // Groq (very cheap)
  'llama-3.3-70b-versatile':           { in: 0.59,  out: 0.79  },
  'llama-3.1-8b-instant':              { in: 0.05,  out: 0.08  },
  // Mistral
  'mistral-large-2501':                { in: 2.00,  out: 6.00  },
  'mistral-small-2503':                { in: 0.10,  out: 0.30  },
};

const USAGE_KEY = 'protech_token_usage';
const BUDGET_KEY = 'protech_budget_limit';
const DEFAULT_BUDGET = 5.00; // $5 default alert threshold

function loadUsage() {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY)) || {}; } catch { return {}; }
}
function saveUsage(u) { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); }
function loadBudget() {
  const v = parseFloat(localStorage.getItem(BUDGET_KEY));
  return isNaN(v) ? DEFAULT_BUDGET : v;
}
function saveBudget(v) { localStorage.setItem(BUDGET_KEY, String(v)); }

function calcCost(model, promptTokens, completionTokens) {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (promptTokens / 1_000_000) * rates.in + (completionTokens / 1_000_000) * rates.out;
}

function UsageWidget({ model }) {
  const [usage, setUsage]   = useState(loadUsage);
  const [budget, setBudget] = useState(loadBudget);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]   = useState('');

  // Refresh when storage changes (other tabs / calls)
  useEffect(() => {
    const handler = () => setUsage(loadUsage());
    window.addEventListener('protech_usage_updated', handler);
    return () => window.removeEventListener('protech_usage_updated', handler);
  }, []);

  const total     = Object.values(usage).reduce((s, u) => s + (u.cost || 0), 0);
  const totalTok  = Object.values(usage).reduce((s, u) => s + (u.tokens || 0), 0);
  const pct       = Math.min((total / budget) * 100, 100);
  const overBudget = total >= budget;

  const reset = () => { saveUsage({}); setUsage({}); };
  const saveBudgetEdit = () => {
    const v = parseFloat(draft);
    if (!isNaN(v) && v > 0) { saveBudget(v); setBudget(v); }
    setEditing(false);
  };

  return (
    <div className="card-bg rounded p-3 flex flex-col gap-2" style={{ fontSize: '0.72rem' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold opacity-70 uppercase tracking-wider">
          <BarChart2 size={12} />
          Token Usage
        </div>
        <button onClick={reset} className="opacity-30 hover:opacity-70 text-xs">reset</button>
      </div>

      {/* Bar */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: 'var(--bg-primary)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: overBudget ? 'var(--accent-danger)' : pct > 70 ? 'var(--accent-warning)' : 'var(--accent-success)',
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between opacity-60">
        <span>${total.toFixed(4)} spent</span>
        <span>{(totalTok / 1000).toFixed(1)}k tokens</span>
        <span style={{ color: overBudget ? 'var(--accent-danger)' : 'inherit' }}>
          {overBudget && <AlertTriangle size={10} className="inline mr-0.5" />}
          ${budget.toFixed(2)} limit
        </span>
      </div>

      {/* Per-model breakdown */}
      {Object.entries(usage).length > 0 && (
        <div className="flex flex-col gap-0.5 opacity-50 border-t pt-1" style={{ borderColor: 'var(--border)' }}>
          {Object.entries(usage).map(([m, u]) => (
            <div key={m} className="flex justify-between">
              <span className="truncate" style={{ maxWidth: '60%' }}>{m}</span>
              <span>${(u.cost || 0).toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Budget edit */}
      <div className="flex items-center gap-2 opacity-50">
        <span>Alert at:</span>
        {editing ? (
          <>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBudgetEdit()}
              className="w-16 rounded px-1 text-xs"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button onClick={saveBudgetEdit} className="text-xs opacity-70 hover:opacity-100">save</button>
          </>
        ) : (
          <button onClick={() => { setDraft(String(budget)); setEditing(true); }} className="underline text-xs">
            ${budget.toFixed(2)}
          </button>
        )}
      </div>

      {overBudget && (
        <div className="text-xs font-bold" style={{ color: 'var(--accent-danger)' }}>
          ⚠ Budget limit reached — check Google Cloud billing
        </div>
      )}
    </div>
  );
}

// ─── Provider Presets ──────────────────────────────────────────────────────────

const PRESETS = {
  pollinations: {
    label: 'Pollinations',
    endpoint: 'https://gen.pollinations.ai',
    keyPlaceholder: 'sk_... (enter.pollinations.ai)',
    needsKey: true,
    note: 'OpenAI-compatible. Get key at enter.pollinations.ai',
    models: [
      'openai', 'openai-large', 'openai-fast',
      'claude', 'claude-fast', 'claude-large',
      'mistral', 'mistral-large',
      'deepseek', 'grok', 'grok-large',
      'qwen-coder', 'qwen-large', 'qwen-vision',
      'gemini', 'gemini-fast', 'gemini-large',
      'kimi', 'nova', 'nova-fast', 'glm', 'minimax',
      'perplexity-fast', 'perplexity-reasoning',
    ],
    imageModels: [
      'flux', 'zimage', 'gptimage', 'gptimage-large',
      'kontext', 'klein', 'wan-image',
    ],
  },
  ollama: {
    label: 'Ollama (Local)',
    endpoint: 'http://127.0.0.1:11434/v1',
    keyPlaceholder: 'ollama',
    defaultKey: 'ollama',
    needsKey: false,
    note: 'Local — no key needed. Click Fetch to load installed models.',
    models: ['llama3.2', 'mistral', 'qwen2.5-coder:1.5b', 'deepseek-r1:1.5b', 'phi3'],
    imageModels: [],
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-...',
    needsKey: true,
    note: 'Free tier models available.',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1:free',
      'anthropic/claude-3.5-sonnet',
      'mistralai/mistral-7b-instruct:free',
    ],
    imageModels: ['black-forest-labs/flux-schnell:free'],
  },
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-...',
    needsKey: true,
    note: '',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    imageModels: ['dall-e-3', 'dall-e-2'],
  },
  gemini: {
    label: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyPlaceholder: 'AIza...',
    needsKey: true,
    note: 'Google Gemini via OpenAI-compatible endpoint. Get key at aistudio.google.com',
    models: ['gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    imageModels: ['imagen-3.0-generate-002'],
  },
  groq: {
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    keyPlaceholder: 'gsk_...',
    needsKey: true,
    note: 'Groq — ultra-fast inference. Free tier available.',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    imageModels: [],
  },
  mistral: {
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1',
    keyPlaceholder: 'sk-...',
    needsKey: true,
    note: '',
    models: ['mistral-large-2501', 'mistral-small-2503', 'codestral-2501'],
    imageModels: ['pixtral-12b-2409'],
  },
  huggingface: {
    label: 'HuggingFace',
    endpoint: 'https://api-inference.huggingface.co/v1',
    keyPlaceholder: 'hf_...',
    needsKey: true,
    note: 'HuggingFace Inference — free tier on many models.',
    models: ['meta-llama/Llama-3.1-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'],
    imageModels: ['black-forest-labs/FLUX.1-schnell'],
  },
  aihorde: {
    label: 'AI Horde',
    endpoint: 'https://aihorde.net/api/v2',
    keyPlaceholder: '0000000000 (anon)',
    defaultKey: '0000000000',
    needsKey: false,
    note: 'AI Horde — free crowd-sourced inference. Slower but costs nothing.',
    models: ['koboldcpp/Mistral-7B', 'koboldcpp/Llama-3'],
    imageModels: ['FLUX.1-schnell', 'stable_diffusion_xl'],
  },
  nexus: {
    label: '⬡ NeXuS Proxy',
    endpoint: '/api/llm/mistral/v1',
    keyPlaceholder: 'no key needed',
    defaultKey: 'nexus',
    needsKey: false,
    note: 'Sovereign — keys server-side, nothing in browser. Switch provider: /api/llm/{mistral|groq|openrouter|google}/v1',
    models: ['mistral-small-latest', 'mistral-large-latest', 'codestral-latest', 'open-mistral-nemo'],
    imageModels: ['flux', 'flux-realism', 'turbo'],
  },
  custom: {
    label: 'Custom',
    endpoint: '',
    keyPlaceholder: 'your-key',
    needsKey: true,
    note: 'Any OpenAI-compatible endpoint.',
    models: [],
    imageModels: [],
  },
};

const STORAGE_KEY = 'protech_ai_config';

function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const cfg = JSON.parse(stored);
      // If the stored model isn't valid for the stored provider, reset it
      const p = PRESETS[cfg.provider];
      if (p && p.models.length > 0 && !p.models.includes(cfg.model)) {
        cfg.model = p.models[0];
        saveConfig(cfg);
      }
      return cfg;
    }
  } catch {}
  // Fresh start — default to NeXuS proxy, keys server-side
  const provider = 'nexus';
  const p = PRESETS[provider];
  return {
    provider,
    endpoint: p.endpoint,
    apiKey:   p.defaultKey || '',
    model:    p.models[0],
    imageModel: p.imageModels[0] || 'flux',
  };
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── NeXuS Character Roles ────────────────────────────────────────────────────

const STUDIO_ROLES = [
  {
    id: 'producer',
    name: '🎬 Producer',
    desc: 'Show workflow, scheduling, logistics',
    prompt: `You are a seasoned media producer working inside NeXuS Production Studio. Your job is to help plan, schedule, and execute shows, podcasts, and streams. Advise on workflow, segment timing, guest coordination, and release strategy. Be direct, practical, and deadline-aware.`,
  },
  {
    id: 'scriptwriter',
    name: '✍️ Script Writer',
    desc: 'Scripts, intros, show notes, copy',
    prompt: `You are a professional script writer for NeXuS Production Studio. Write compelling intros, segment scripts, show notes, episode descriptions, and social copy. Match the tone of the show — adapt from casual podcast to formal broadcast. Output clean, ready-to-use copy.`,
  },
  {
    id: 'creative_dir',
    name: '🎨 Creative Director',
    desc: 'Visual direction, mood, branding',
    prompt: `You are the Creative Director for NeXuS Production Studio. Guide visual identity, colour palettes, set design, thumbnail concepts, and overall aesthetic direction. NeXuS has a cyberpunk-sovereign aesthetic — dark, neon-accented, technically precise, beautifully rebellious.`,
  },
  {
    id: 'market_analyst',
    name: '📊 Market Analyst',
    desc: 'Audience research, content strategy',
    prompt: `You are a media market analyst for NeXuS Production Studio. Help identify target audiences, analyse content trends, suggest topics with strong reach, and evaluate the competitive landscape. Focus on independent, tech-savvy, privacy-conscious communities. Ground insights in data where possible.`,
  },
  {
    id: 'host',
    name: '🎙️ Show Host',
    desc: 'Warm, engaging on-air persona',
    prompt: `You are the AI co-host persona for NeXuS Production Studio. Engage warmly, ask great questions, help bridge topics for listeners, and keep energy up. You are knowledgeable about tech, privacy, decentralisation, and creative culture. Never break character on air.`,
  },
  {
    id: 'sound_designer',
    name: '🎚️ Sound Designer',
    desc: 'Audio production, mixing, SFX advice',
    prompt: `You are a sound designer and audio engineer for NeXuS Production Studio. Advise on microphone technique, room acoustics, EQ/compression settings, music bed selection, sound effects, and broadcast-quality audio standards. Be technically precise but approachable.`,
  },
  {
    id: 'researcher',
    name: '🔍 Researcher',
    desc: 'Deep dives, fact-checking, sourcing',
    prompt: `You are a research specialist for NeXuS Production Studio. Provide thorough background research, verify facts, surface primary sources, and prepare briefing documents for hosts and guests. Specialise in technology, cryptography, privacy, and decentralised systems.`,
  },
];

const ROLES_KEY = 'protech_active_role';

function loadRole() {
  try {
    const stored = localStorage.getItem(ROLES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return STUDIO_ROLES[0]; // Producer by default
}

function saveRole(role) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(role));
}

// ─── Message Component ─────────────────────────────────────────────────────────

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-cyan-600' : 'bg-purple-700'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
        style={{
          background: isUser ? 'rgba(0,180,220,0.15)' : 'rgba(120,60,200,0.15)',
          border: `1px solid ${isUser ? 'rgba(0,243,255,0.2)' : 'rgba(180,126,255,0.2)'}`,
        }}
      >
        {msg.content}
        {msg.loading && <span className="inline-block ml-2 animate-pulse">▋</span>}
      </div>
    </div>
  );
}

// ─── Provider Settings Panel ───────────────────────────────────────────────────

function ProviderSettings({ cfg, onChange }) {
  const [open, setOpen] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const preset = PRESETS[cfg.provider] || PRESETS.custom;

  const applyProvider = (provider) => {
    const p = PRESETS[provider] || PRESETS.custom;
    const next = {
      ...cfg,
      provider,
      endpoint: p.endpoint,
      apiKey: p.defaultKey ?? cfg.apiKey ?? '',
      model: p.models[0] || cfg.model || '',
    };
    onChange(next);
    saveConfig(next);
  };

  const update = (key, val) => {
    const next = { ...cfg, [key]: val };
    onChange(next);
    saveConfig(next);
  };

  const fetchOllama = async () => {
    setFetchingModels(true);
    try {
      const base = (cfg.endpoint || 'http://127.0.0.1:11434/v1').replace('/v1', '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/tags`);
      const data = await res.json();
      const names = (data.models || []).map(m => m.name);
      setOllamaModels(names);
      if (names.length > 0) update('model', names[0]);
    } catch {
      setOllamaModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const modelList = cfg.provider === 'ollama' && ollamaModels.length > 0
    ? ollamaModels : preset.models;

  return (
    <div className="card-bg rounded p-3 mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-sm font-bold opacity-70 uppercase tracking-wider"
      >
        <span className="flex items-center gap-2">
          <Settings size={13} /> AI Provider
          <span className="text-xs font-normal opacity-60">
            {preset.label} · {cfg.model || '—'}
          </span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Provider pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyProvider(key)}
                className={`px-2.5 py-1 rounded text-xs font-medium studio-btn ${cfg.provider === key ? 'btn-active' : 'btn-inactive'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset.note && <p className="text-xs opacity-40 italic">{preset.note}</p>}

          {/* Endpoint */}
          <div>
            <label className="text-xs opacity-50 block mb-1">Endpoint URL</label>
            <input
              type="text"
              value={cfg.endpoint || ''}
              onChange={e => update('endpoint', e.target.value)}
              className="w-full studio-input rounded px-3 py-1.5 text-xs font-mono"
            />
          </div>

          {/* API Key */}
          {(preset.needsKey || cfg.provider === 'custom') && (
            <div>
              <label className="text-xs opacity-50 block mb-1">API Key</label>
              <input
                type="password"
                value={cfg.apiKey || ''}
                onChange={e => update('apiKey', e.target.value)}
                placeholder={preset.keyPlaceholder}
                className="w-full studio-input rounded px-3 py-1.5 text-xs font-mono"
              />
            </div>
          )}

          {/* Model */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs opacity-50">Chat Model</label>
              {cfg.provider === 'ollama' && (
                <button onClick={fetchOllama} disabled={fetchingModels} className="text-xs opacity-60 hover:opacity-100">
                  {fetchingModels ? 'fetching…' : 'Fetch installed'}
                </button>
              )}
            </div>
            <input
              type="text"
              list="ai-model-list"
              value={cfg.model || ''}
              onChange={e => update('model', e.target.value)}
              className="w-full studio-input rounded px-3 py-1.5 text-xs font-mono"
              placeholder={preset.models[0] || 'model name'}
            />
            {modelList.length > 0 && (
              <datalist id="ai-model-list">
                {modelList.map(m => <option key={m} value={m} />)}
              </datalist>
            )}
            {ollamaModels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ollamaModels.map(m => (
                  <button
                    key={m}
                    onClick={() => update('model', m)}
                    className={`text-xs px-2 py-0.5 rounded studio-btn ${cfg.model === m ? 'btn-active' : 'btn-inactive'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!preset.needsKey && cfg.provider !== 'custom' && (
            <div className="text-xs flex items-center gap-2 opacity-50">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
              No API key required
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main AIPanel ──────────────────────────────────────────────────────────────

export default function AIPanel({ recordings, activeStream }) {
  const [cfg, setCfg]         = useState(loadConfig);
  const [activeRole, setActiveRole] = useState(loadRole);
  const [customRoles, setCustomRoles] = useState([]); // loaded from /charcard
  const [messages, setMessages] = useState(() => {
    const r = loadRole();
    return [{ id: 0, role: 'assistant', content: `${r.name} online. ${r.desc}. How can I help with your production today?` }];
  });
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');

  // Load NeXuS character cards from the charcard service if available
  useEffect(() => {
    fetch('/charcard/api/characters').then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const cards = (Array.isArray(data) ? data : data.characters || [])
          .filter(c => c.name && c.description)
          .map(c => ({
            id:     `card_${c.name}`,
            name:   `🃏 ${c.name}`,
            desc:   c.description?.slice(0, 60) || 'NeXuS character',
            prompt: c.personality || c.description || c.scenario || c.name,
            isCard: true,
          }));
        if (cards.length) setCustomRoles(cards);
      }).catch(() => {});
  }, []);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Live Transcription ────────────────────────────────────────────────────────

  const startTranscription = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition requires Chrome or Edge.'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) setTranscript(t => t + final);
      setInterimTranscript(interim);
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') setError('Transcription error: ' + e.error);
      setTranscribing(false);
    };
    rec.onend = () => {
      setInterimTranscript('');
      if (transcribing) rec.start();
    };
    recognitionRef.current = rec;
    rec.start();
    setTranscribing(true);
    setError('');
  }, [transcribing]);

  const stopTranscription = useCallback(() => {
    recognitionRef.current?.stop();
    setTranscribing(false);
    setInterimTranscript('');
  }, []);

  // ── AI Call (OpenAI-compatible) ───────────────────────────────────────────────

  const callAI = async (userMessage, context = '') => {
    const { provider, endpoint, apiKey, model } = cfg;
    if (!endpoint) throw new Error('No endpoint set. Configure a provider above.');

    const preset = PRESETS[provider] || PRESETS.custom;
    if (preset.needsKey && !apiKey) {
      throw new Error('API key required. Open provider settings above and add your key.');
    }

    const contextMsg = context
      ? `Context (transcript):\n${context}\n\nQuestion: ${userMessage}`
      : userMessage;

    // Build /v1/chat/completions URL
    let base = endpoint.replace(/\/+$/, '');
    if (provider === 'pollinations' && !base.endsWith('/v1')) base = base + '/v1';
    const url = `${base}/chat/completions`;

    const body = {
      model: model || 'openai',
      messages: [
        { role: 'system', content: activeRole?.prompt || SYSTEM_PROMPT },
        ...messages
          .filter(m => !m.loading && m.id !== 0)
          .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: contextMsg },
      ],
      temperature: 0.8,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${res.status} — ${errText || res.statusText}`);
    }
    const data = await res.json();

    // Track token usage + cost
    if (data.usage) {
      const { prompt_tokens = 0, completion_tokens = 0 } = data.usage;
      const cost = calcCost(model, prompt_tokens, completion_tokens);
      const existing = loadUsage();
      const entry = existing[model] || { tokens: 0, cost: 0 };
      existing[model] = {
        tokens: entry.tokens + prompt_tokens + completion_tokens,
        cost:   entry.cost  + cost,
      };
      saveUsage(existing);
      window.dispatchEvent(new Event('protech_usage_updated'));
    }

    return data.choices?.[0]?.message?.content || 'No response from AI.';
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const context = transcript && text.toLowerCase().includes('transcript') ? transcript : '';
    const userMsg = { id: Date.now(), role: 'user', content: text };
    const loadingMsg = { id: Date.now() + 1, role: 'assistant', content: '', loading: true };
    setMessages(m => [...m, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);
    setError('');
    try {
      const reply = await callAI(text, context);
      setMessages(m => m.map(msg => msg.loading ? { ...msg, content: reply, loading: false } : msg));
    } catch (e) {
      setMessages(m => m.map(msg => msg.loading ? { ...msg, content: `Error: ${e.message}`, loading: false } : msg));
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Quick Actions ─────────────────────────────────────────────────────────────

  const quickActions = [
    { label: 'Title Ideas', prompt: 'Based on the transcript, suggest 5 creative episode/video titles.' },
    { label: 'Description', prompt: 'Write a compelling YouTube/podcast description from the transcript.' },
    { label: 'Show Notes', prompt: 'Generate structured show notes with key points from the transcript.' },
    { label: 'Key Points', prompt: 'Extract and summarize the 5 most important points from the transcript.' },
    { label: 'Intro Script', prompt: 'Write an engaging intro script for my show based on this content.' },
    { label: 'Radio Promo', prompt: 'Write a 30-second radio promo script for NeXuS AM Radio based on this content.' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Provider Settings */}
      <ProviderSettings cfg={cfg} onChange={setCfg} />

      {/* Character Role Selector */}
      <div className="card-bg rounded p-3">
        <div className="text-xs opacity-50 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span>🎭</span> Active Character Role
          {activeRole?.isCard && <span className="opacity-40">(NeXuS card)</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[...STUDIO_ROLES, ...customRoles].map(role => (
            <button
              key={role.id}
              onClick={() => {
                setActiveRole(role);
                saveRole(role);
                setMessages([{ id: 0, role: 'assistant',
                  content: `${role.name} online. ${role.desc}. How can I help with your production today?` }]);
              }}
              className={`px-2.5 py-1 rounded text-xs studio-btn ${activeRole?.id === role.id ? 'btn-active' : 'btn-inactive'}`}
              title={role.desc}
            >
              {role.name}
            </button>
          ))}
        </div>
        {activeRole && (
          <p className="text-xs opacity-40 italic">{activeRole.desc}</p>
        )}
      </div>

      {/* Token Usage Tracker */}
      <UsageWidget model={cfg.model} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1" style={{ minHeight: '500px' }}>

        {/* Left: Live Transcription */}
        <div className="card-bg rounded p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
              <FileText size={15} /> Live Transcription
            </h3>
            <div className="flex gap-2">
              {transcript && (
                <>
                  <button
                    onClick={() => navigator.clipboard.writeText(transcript)}
                    className="text-xs studio-btn btn-inactive px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy
                  </button>
                  <button onClick={() => setTranscript('')} className="text-xs studio-btn btn-inactive px-2 py-1 rounded">
                    Clear
                  </button>
                </>
              )}
              <button
                onClick={transcribing ? stopTranscription : startTranscription}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold studio-btn ${transcribing ? 'btn-stop' : 'btn-record'}`}
              >
                {transcribing ? <><MicOff size={12} /> Stop</> : <><Mic size={12} /> Start</>}
              </button>
            </div>
          </div>

          {transcribing && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Listening… (Chrome/Edge required)
            </div>
          )}

          <div
            className="flex-1 rounded p-3 text-sm leading-relaxed overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.3)', minHeight: '180px', maxHeight: '300px' }}
          >
            {transcript
              ? <span className="opacity-80">{transcript}</span>
              : <span className="opacity-20 italic">Transcript will appear here as you speak…</span>
            }
            {interimTranscript && <span className="opacity-40 italic">{interimTranscript}</span>}
          </div>

          {/* Quick Actions */}
          <div>
            <div className="text-xs opacity-40 uppercase tracking-wider mb-2">Quick Actions</div>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map(a => (
                <button
                  key={a.label}
                  onClick={() => { setInput(a.prompt); inputRef.current?.focus(); }}
                  className="px-2 py-1 rounded text-xs studio-btn btn-inactive flex items-center gap-1"
                >
                  <Sparkles size={10} /> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="card-bg rounded p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
            <Brain size={15} /> AI Chat
          </h3>

          <div
            className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1"
            style={{ minHeight: '220px', maxHeight: '320px' }}
          >
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="text-xs text-red-400 px-2">{error}</div>}

          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Ask AI about your content… (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="flex-1 p-2 rounded studio-input text-sm resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 rounded studio-btn btn-active flex items-center justify-center"
            >
              {isLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          <p className="text-xs opacity-25 text-center">
            {cfg.provider === 'pollinations'
              ? `Pollinations · ${cfg.model || 'openai'} · mention "transcript" to include it`
              : `${(PRESETS[cfg.provider] || PRESETS.custom).label} · ${cfg.model || '—'}`}
          </p>
        </div>
      </div>
    </div>
  );
}
