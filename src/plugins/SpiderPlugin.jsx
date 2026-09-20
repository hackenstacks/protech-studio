import { useState } from 'react';
import { Search, Globe, Loader, ExternalLink } from 'lucide-react';

export function SpiderPlugin() {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('scrape'); // 'scrape' | 'search'
  const [query, setQuery] = useState('');

  async function scrape() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/nexus/spider?url=${encodeURIComponent(url)}&depth=${depth}`);
      const data = await res.json();
      setResults(data.links || []);
    } catch {
      setResults([{ href: '#', text: 'Error connecting to spider API.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/nexus/search-web?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([{ href: '#', text: 'Error.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="plugin-spider">
      <div className="spider-mode-toggle">
        <button
          className={`dock-action-btn${mode === 'scrape' ? ' dock-btn-active' : ''}`}
          onClick={() => setMode('scrape')}
        >
          <Globe size={13} /> Scrape
        </button>
        <button
          className={`dock-action-btn${mode === 'search' ? ' dock-btn-active' : ''}`}
          onClick={() => setMode('search')}
        >
          <Search size={13} /> Search
        </button>
      </div>

      {mode === 'scrape' ? (
        <div className="spider-controls">
          <input
            className="studio-input flex-1 text-xs"
            placeholder="https://target.url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scrape()}
          />
          <select
            className="studio-select text-xs px-2 rounded"
            value={depth}
            onChange={e => setDepth(Number(e.target.value))}
          >
            <option value={1}>Depth 1</option>
            <option value={2}>Depth 2</option>
            <option value={3}>Depth 3</option>
          </select>
          <button className="dock-action-btn" onClick={scrape} disabled={loading}>
            {loading ? <Loader size={13} className="animate-spin" /> : <Globe size={13} />}
          </button>
        </div>
      ) : (
        <div className="spider-controls">
          <input
            className="studio-input flex-1 text-xs"
            placeholder="Search query…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button className="dock-action-btn" onClick={search} disabled={loading}>
            {loading ? <Loader size={13} className="animate-spin" /> : <Search size={13} />}
          </button>
        </div>
      )}

      <div className="spider-results">
        {!loading && results.length === 0 && (
          <p className="notes-empty">Enter a URL or query above.</p>
        )}
        {results.map((r, i) => (
          <a key={i} href={r.href || r.url} target="_blank" rel="noreferrer" className="rss-item">
            <span className="rss-item-title">{r.text || r.title || r.href || r.url}</span>
            <ExternalLink size={10} className="opacity-30 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
