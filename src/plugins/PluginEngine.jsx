import { useState, useCallback } from 'react';
import {
  FileText, Lock, Bookmark, Bot, Rss, Globe,
  Wifi, Share2, Activity, SlidersHorizontal, Radio, Flame, PhoneCall,
} from 'lucide-react';

export const PLUGIN_REGISTRY = [
  { id: 'controlboard', label: 'Board',   Icon: SlidersHorizontal, slideFrom: 'top',    domain: true  },
  { id: 'radio',        label: 'Radio',   Icon: Radio,             slideFrom: 'bottom', overlay: true },
  { id: 'fireside',     label: 'Fireside',Icon: Flame,             slideFrom: 'right'                 },
  { id: 'callin',       label: 'Call-in', Icon: PhoneCall,         slideFrom: 'right'                 },
  { id: 'notes',        label: 'Notes',   Icon: FileText,          slideFrom: 'top',    domain: true  },
  { id: 'vault',        label: 'Vault',   Icon: Lock,              slideFrom: 'top',    domain: true  },
  { id: 'bookmarks',    label: 'Bookmarks',Icon: Bookmark,         slideFrom: 'right'                 },
  { id: 'ai',           label: 'AI',      Icon: Bot,               slideFrom: 'right'                 },
  { id: 'rss',          label: 'RSS',     Icon: Rss,               slideFrom: 'left'                  },
  { id: 'spider',       label: 'Spider',  Icon: Globe,             slideFrom: 'left'                  },
  { id: 'networks',     label: 'Networks',Icon: Wifi,              slideFrom: 'bottom', strip: true   },
  { id: 'platforms',    label: 'Platforms',Icon: Share2,           slideFrom: 'bottom', strip: true   },
  { id: 'eq',           label: 'EQ',      Icon: Activity,          slideFrom: 'bottom', overlay: true },
];

export function usePluginState() {
  const [open, setOpen] = useState({});
  const [data, setDataState] = useState({});

  const toggle = useCallback((id) => {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const close = useCallback((id) => {
    setOpen(prev => ({ ...prev, [id]: false }));
  }, []);

  const isOpen = (id) => !!open[id];

  const setData = useCallback((id, updater) => {
    setDataState(prev => ({
      ...prev,
      [id]: typeof updater === 'function' ? updater(prev[id]) : updater,
    }));
  }, []);

  const getData = (id) => data[id];

  return { toggle, close, isOpen, setData, getData };
}

export function DockBar({ pluginState }) {
  const { isOpen, toggle } = pluginState;

  return (
    <div className="dock-bar">
      {PLUGIN_REGISTRY.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => toggle(id)}
          className={`dock-btn${isOpen(id) ? ' dock-btn-active' : ''}`}
          title={label}
        >
          <Icon size={16} />
          <span className="dock-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
