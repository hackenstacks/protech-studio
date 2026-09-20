import { useState, useRef } from 'react';
import { Terminal, Send, Trash2, Copy } from 'lucide-react';

// NeXuS Terminal — runs commands through /api/nexus/exec (proxy → local shell).
// No external CDN. No CheerpX. Fully sovereign.

// Commands must match _EXEC_WHITELIST keys exactly in nexus_web_server.py
const QUICK_CMDS = [
  { label: 'Studio status',    cmd: 'nexus-studio status' },
  { label: 'Studio start',     cmd: 'nexus-studio start' },
  { label: 'Studio stop',      cmd: 'nexus-studio stop' },
  { label: 'Start Murmur',     cmd: 'nexus-studio murmur' },
  { label: 'Start Owncast',    cmd: 'nexus-studio owncast' },
  { label: 'Proxy status',     cmd: 'nexus-api-proxy status' },
  { label: 'Proxy restart',    cmd: 'nexus-api-proxy restart' },
  { label: 'Owncast logs',     cmd: 'podman logs nexus-owncast' },
  { label: 'Container list',   cmd: 'podman ps' },
  { label: 'Bridge health',    cmd: 'bridge health' },
  { label: 'Disk usage',       cmd: 'df -h' },
  { label: 'Murmur port',      cmd: 'murmur status' },
];

export default function TerminalPanel() {
  const [lines, setLines]     = useState([{ type: 'info', text: 'NeXuS Terminal — local bridge. No external dependencies.' }]);
  const [input, setInput]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const outputRef = useRef(null);

  const append = (type, text) => {
    setLines(prev => {
      const next = [...prev, { type, text }];
      setTimeout(() => outputRef.current?.scrollTo(0, outputRef.current.scrollHeight), 0);
      return next;
    });
  };

  const run = async (cmd) => {
    if (!cmd.trim()) return;
    setBusy(true);
    append('cmd', `$ ${cmd}`);
    setHistory(h => [cmd, ...h.filter(c => c !== cmd)].slice(0, 50));
    setHistIdx(-1);
    setInput('');

    try {
      const res = await fetch('/api/nexus/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        if (d.stdout) append('out', d.stdout);
        if (d.stderr) append('err', d.stderr);
        if (!d.stdout && !d.stderr) append('info', `exit ${d.code ?? 0}`);
      } else if (res.status === 403 && d.allowed) {
        append('warn', `"${cmd}" is not in the exec whitelist.`);
        append('info', `Allowed commands:\n${d.allowed.join('\n')}`);
      } else {
        append('warn', d.error || `Error ${res.status}`);
      }
    } catch {
      append('warn', 'Bridge offline — check proxy: nexus-api-proxy status');
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { run(input); return; }
    if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx); setInput(history[idx] ?? '');
      e.preventDefault(); return;
    }
    if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx); setInput(idx === -1 ? '' : history[idx]);
      e.preventDefault();
    }
  };

  const copy = () => navigator.clipboard.writeText(lines.map(l => l.text).join('\n')).catch(() => {});

  const colorFor = (type) => ({
    cmd:  'var(--accent-primary)',
    err:  'var(--accent-danger)',
    warn: 'var(--accent-warning)',
    info: 'var(--text-secondary)',
    out:  'var(--text-primary)',
  }[type] ?? 'var(--text-primary)');

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: '500px' }}>

      <div className="card-bg rounded p-3 flex items-center gap-2">
        <Terminal size={15} className="opacity-60" />
        <span className="text-sm font-bold opacity-70 uppercase tracking-wider">NeXuS Terminal</span>
        <span className="text-xs opacity-30 ml-1">· sovereign · no CDN</span>
        <div className="ml-auto flex gap-2">
          <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded text-xs studio-btn">
            <Copy size={11} /> Copy
          </button>
          <button onClick={() => setLines([])} className="flex items-center gap-1 px-2 py-1 rounded text-xs studio-btn">
            <Trash2 size={11} /> Clear
          </button>
        </div>
      </div>

      <div
        ref={outputRef}
        className="card-bg rounded p-3 flex-1 overflow-y-auto font-mono text-xs leading-relaxed"
        style={{ minHeight: '320px', maxHeight: '440px' }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ color: colorFor(l.type), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {l.text}
          </div>
        ))}
        {busy && <div style={{ color: 'var(--accent-primary)' }} className="animate-pulse">▋</div>}
      </div>

      <div className="card-bg rounded p-2 flex gap-2 items-center">
        <span className="font-mono text-xs opacity-50 select-none">$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          placeholder="command… (↑↓ history, Enter to run)"
          className="flex-1 bg-transparent font-mono text-xs outline-none"
          style={{ color: 'var(--text-primary)' }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => run(input)}
          disabled={busy || !input.trim()}
          className="flex items-center gap-1 px-3 py-1 rounded text-xs studio-btn btn-active disabled:opacity-40"
        >
          <Send size={11} /> Run
        </button>
      </div>

      <div className="card-bg rounded p-3">
        <div className="text-xs opacity-40 uppercase tracking-wider mb-2">Quick Commands</div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CMDS.map(q => (
            <button
              key={q.label}
              onClick={() => run(q.cmd)}
              disabled={busy}
              className="px-2 py-1 rounded text-xs studio-btn disabled:opacity-40"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
