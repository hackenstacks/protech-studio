import { useState } from 'react';

// Same-origin relative links — no hardcoded host.
const NETWORKS = [
  { id: 'tor',        label: 'Tor',        icon: '🧅', href: '/nncc' },
  { id: 'i2p',        label: 'I2P',        icon: '🔵', href: '/nncc' },
  { id: 'reticulum',  label: 'Reticulum',  icon: '📡', href: null },
  { id: 'yggdrasil',  label: 'Yggdrasil',  icon: '🌲', href: null },
  { id: 'vpn',        label: 'VPN',        icon: '🔒', href: null },
  { id: 'gemini',     label: 'Gemini',     icon: '♊', href: null },
  { id: 'gopher',     label: 'Gopher',     icon: '🐹', href: null },
  { id: 'txt',        label: 'twtxt',      icon: '📝', href: '/txt' },
  { id: 'nncc',       label: 'NCM',        icon: '🕹️', href: '/nncc' },
];

export function NetworksPlugin() {
  const [active, setActive] = useState({});

  function toggle(id, href) {
    if (href) { window.open(href, '_blank'); return; }
    setActive(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="plugin-strip">
      <p className="plugin-section-label mb-2">Dark Networks & Protocols</p>
      <div className="strip-grid">
        {NETWORKS.map(n => (
          <button
            key={n.id}
            className={`strip-chip${active[n.id] ? ' strip-chip-active' : ''}`}
            onClick={() => toggle(n.id, n.href)}
            title={n.label}
          >
            <span className="strip-icon">{n.icon}</span>
            <span className="strip-label">{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
