import { useState } from 'react';
import { RefreshCw, Plus, ExternalLink, Trash2 } from 'lucide-react';

const DEFAULT_FEEDS = [
  { id: 1, label: 'NeXuS twtxt', url: '/twtxt.txt' },
  { id: 2, label: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
];

const STORAGE_KEY = 'nexus_studio_rss_feeds';

function loadFeeds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_FEEDS; } catch { return DEFAULT_FEEDS; }
}

export function RSSPlugin() {
  const [feeds, setFeeds] = useState(loadFeeds);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeFeed, setActiveFeed] = useState(null);

  async function fetchFeed(feed) {
    setActiveFeed(feed.id);
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch(`/api/nexus/rss-fetch?url=${encodeURIComponent(feed.url)}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([{ title: 'Error fetching feed.', link: '#', pubDate: '' }]);
    } finally {
      setLoading(false);
    }
  }

  function addFeed() {
    if (!newUrl.trim()) return;
    const feed = { id: Date.now(), label: new URL(newUrl).hostname, url: newUrl };
    const updated = [...feeds, feed];
    setFeeds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewUrl('');
    setAdding(false);
  }

  function removeFeed(id) {
    const updated = feeds.filter(f => f.id !== id);
    setFeeds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (activeFeed === id) { setActiveFeed(null); setItems([]); }
  }

  return (
    <div className="plugin-rss">
      <div className="rss-feeds">
        {feeds.map(f => (
          <div key={f.id} className={`rss-feed-item${activeFeed === f.id ? ' rss-feed-active' : ''}`}>
            <button className="flex-1 text-left" onClick={() => fetchFeed(f)}>
              {f.label}
            </button>
            <button className="dock-action-btn" onClick={() => removeFeed(f.id)}>
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {adding ? (
          <div className="flex gap-1 mt-1">
            <input
              className="studio-input flex-1 text-xs"
              placeholder="Feed URL"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFeed()}
            />
            <button className="dock-action-btn text-xs" onClick={addFeed}>+</button>
            <button className="dock-action-btn text-xs" onClick={() => setAdding(false)}>✕</button>
          </div>
        ) : (
          <button className="bookmark-add-btn mt-1" onClick={() => setAdding(true)}>
            <Plus size={12} /> Add Feed
          </button>
        )}
      </div>

      <div className="rss-items">
        {loading && <p className="notes-empty"><RefreshCw size={14} className="animate-spin inline mr-1" />Loading…</p>}
        {!loading && items.length === 0 && activeFeed && <p className="notes-empty">No items found.</p>}
        {!loading && !activeFeed && <p className="notes-empty">Select a feed to load.</p>}
        {items.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noreferrer" className="rss-item">
            <span className="rss-item-title">{item.title}</span>
            {item.pubDate && <span className="rss-item-date">{new Date(item.pubDate).toLocaleDateString()}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
