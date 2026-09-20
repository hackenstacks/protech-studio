import { useState } from 'react';
import { Send, Loader } from 'lucide-react';

const PROVIDERS = [
  { id: 'mistral',   label: 'Mistral (free)' },
  { id: 'groq',      label: 'Groq'           },
  { id: 'deepseek',  label: 'DeepSeek'       },
  { id: 'cerebras',  label: 'Cerebras'       },
  { id: 'google',    label: 'Gemini'         },
];

export function AIPlugin() {
  const [provider, setProvider] = useState('mistral');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, messages: history }),
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

  return (
    <div className="plugin-ai">
      <div className="ai-toolbar">
        <select
          className="studio-select text-xs px-2 py-1 rounded"
          value={provider}
          onChange={e => setProvider(e.target.value)}
        >
          {PROVIDERS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button className="dock-action-btn text-xs" onClick={() => setMessages([])}>
          Clear
        </button>
      </div>

      <div className="ai-messages">
        {messages.length === 0 && (
          <p className="notes-empty">Ask anything. Powered by NeXuS proxy.</p>
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
