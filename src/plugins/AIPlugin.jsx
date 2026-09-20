import { useState, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';

export function AIPlugin() {
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState('');
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Pull every chat-capable provider the proxy knows about (no hardcoding).
  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then(d => {
        const list = Object.values(d.providers || {})
          .filter(p => (p.kind || '').includes('chat'))
          // key-present providers first
          .sort((a, b) => (b.key_present === true) - (a.key_present === true));
        setProviders(list);
        const first = list.find(p => p.key_present) || list[0];
        if (first) setProvider(first.id);
      })
      .catch(() => {});
  }, []);

  // Live model list for the chosen provider.
  useEffect(() => {
    if (!provider) return;
    setModels([]); setModel('');
    fetch(`/api/models/provider/${provider}`)
      .then(r => r.json())
      .then(d => {
        const m = d.models || [];
        setModels(m);
        if (m.length) setModel(m[0]);
      })
      .catch(() => {});
  }, [provider]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const body = { provider, messages: history };
      if (model) body.model = model;
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || data.error || 'No response.';
      setMessages([...history, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Error connecting to AI.' }]);
    } finally {
      setLoading(false);
    }
  }

  const cur = providers.find(p => p.id === provider);

  return (
    <div className="plugin-ai">
      <div className="ai-toolbar">
        <select
          className="studio-select text-xs px-2 py-1 rounded"
          value={provider}
          onChange={e => setProvider(e.target.value)}
        >
          {providers.length === 0 && <option value="">Loading providers…</option>}
          {providers.map(p => (
            <option key={p.id} value={p.id}>
              {p.key_present ? '● ' : '○ '}{p.label}
            </option>
          ))}
        </select>
        <select
          className="studio-select text-xs px-2 py-1 rounded flex-1"
          value={model}
          onChange={e => setModel(e.target.value)}
          title="Model"
        >
          {models.length === 0 && <option value="">default</option>}
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="dock-action-btn text-xs" onClick={() => setMessages([])}>Clear</button>
      </div>

      {cur && cur.requires_key && !cur.key_present && (
        <p className="cb-hint">⚠ {cur.label} has no key set in nexus.env — responses will fail.</p>
      )}

      <div className="ai-messages">
        {messages.length === 0 && (
          <p className="notes-empty">Ask anything. {providers.length} providers via the NeXuS proxy — keys stay server-side.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ai-msg-${m.role}`}>
            <span className="ai-role">{m.role === 'user' ? 'You' : 'AI'}</span>
            <p className="ai-content">{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="ai-msg ai-msg-assistant">
            <Loader size={14} className="animate-spin opacity-60" />
          </div>
        )}
      </div>

      <div className="ai-input-row">
        <textarea
          className="studio-input ai-textarea"
          placeholder="Ask something…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
        />
        <button className="dock-action-btn ai-send-btn" onClick={send} disabled={loading}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
