import { useState, useEffect, useRef } from 'react';
import { Send, Flame, Mic, Loader, Users } from 'lucide-react';

async function api(path, opts) {
  const res = await fetch(`/api/nexus/aether/${path}`, opts);
  return res.json();
}

const SHOW_INTRO =
  "Welcome to The FoRaGe where we light the wick and bring the noise — " +
  "welcome to LivEwiRe's Friday coding frenzy, brought to you straight from " +
  "The ForGe where we go beyond the code, the place where the Code comes alive. " +
  "Join us and Ride-The-Lightning ⚡";

export function FiresidePlugin() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('Host');
  const [personas, setPersonas] = useState([]);
  const [interviewee, setInterviewee] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' | 'interview'
  const endRef = useRef(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try { const d = await api('chat'); if (alive) setMessages(d.messages || []); } catch { /* */ }
    }
    poll();
    const t = setInterval(poll, 4000);
    api('personas').then(d => {
      setPersonas(d.personas || []);
      if (d.personas?.[0]) setInterviewee(d.personas[0].name);
    }).catch(() => {});
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!text.trim()) return;
    const body = { author: author || 'anon', role: 'human', text };
    setText('');
    await api('chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
    const d = await api('chat'); setMessages(d.messages || []);
  }

  async function interview() {
    if (!question.trim() || !interviewee) return;
    setAsking(true);
    const q = question; setQuestion('');
    try {
      await api('interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: interviewee, question: q }),
      });
      const d = await api('chat'); setMessages(d.messages || []);
    } finally { setAsking(false); }
  }

  return (
    <div className="plugin-fireside">
      <div className="fireside-tabs">
        <button className={`dock-action-btn${mode === 'chat' ? ' dock-btn-active' : ''}`} onClick={() => setMode('chat')}>
          <Flame size={13} /> Chat
        </button>
        <button className={`dock-action-btn${mode === 'interview' ? ' dock-btn-active' : ''}`} onClick={() => setMode('interview')}>
          <Mic size={13} /> Interview
        </button>
      </div>

      <div className="fireside-intro">
        <Flame size={13} className="radio-live" /> <span>{SHOW_INTRO}</span>
      </div>

      <div className="fireside-log">
        {messages.length === 0 && <p className="notes-empty">🔥 The fire's lit. Say hello — humans and AI welcome.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`fireside-msg fireside-${m.role}`}>
            <span className="fireside-author">{m.author}{m.role === 'ai' && ' 🤖'}</span>
            <p className="fireside-text">{m.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {mode === 'chat' ? (
        <div className="fireside-input">
          <input
            className="studio-input fireside-author-input"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="name"
          />
          <input
            className="studio-input flex-1"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Say something by the fire…"
          />
          <button className="dock-action-btn" onClick={send}><Send size={15} /></button>
        </div>
      ) : (
        <div className="fireside-interview">
          <div className="fireside-persona-row">
            <Users size={13} className="opacity-50" />
            <select className="studio-select flex-1 text-xs px-2 py-1 rounded" value={interviewee} onChange={e => setInterviewee(e.target.value)}>
              {personas.length === 0 && <option value="">No personas found</option>}
              {personas.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="fireside-input">
            <input
              className="studio-input flex-1"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && interview()}
              placeholder={`Ask ${interviewee || 'the guest'} on-air…`}
            />
            <button className="dock-action-btn" onClick={interview} disabled={asking}>
              {asking ? <Loader size={15} className="animate-spin" /> : <Mic size={15} />}
            </button>
          </div>
          <p className="cb-hint">Answers post live to the fireside. Routed through aichat :3030 in the persona's voice.</p>
        </div>
      )}
    </div>
  );
}
