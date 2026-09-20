import { useState } from 'react';
import { Upload, FileText, Image, Music, Film, Trash2, Download } from 'lucide-react';

const STORAGE_KEY = 'nexus_studio_vault';

function loadVault() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function typeIcon(mime) {
  if (!mime) return <FileText size={14} />;
  if (mime.startsWith('image/')) return <Image size={14} />;
  if (mime.startsWith('audio/')) return <Music size={14} />;
  if (mime.startsWith('video/')) return <Film size={14} />;
  return <FileText size={14} />;
}

export function VaultPlugin() {
  const [files, setFiles] = useState(loadVault);

  function handleDrop(e) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }

  function handleInput(e) {
    addFiles(Array.from(e.target.files));
  }

  function addFiles(fileList) {
    const entries = fileList.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.type,
      added: new Date().toISOString(),
    }));
    const updated = [...files, ...entries];
    setFiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function remove(id) {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function fmt(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  return (
    <div className="plugin-vault">
      <div
        className="vault-drop"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('vault-file-input').click()}
      >
        <Upload size={22} />
        <span>Drop files here or click to upload</span>
        <input id="vault-file-input" type="file" multiple hidden onChange={handleInput} />
      </div>

      <div className="vault-list">
        {files.length === 0 && (
          <p className="notes-empty">Vault is empty. Drop any file to store.</p>
        )}
        {files.map(f => (
          <div key={f.id} className="vault-item">
            <span className="vault-icon">{typeIcon(f.type)}</span>
            <div className="vault-meta">
              <span className="vault-name">{f.name}</span>
              <span className="vault-size">{fmt(f.size)}</span>
            </div>
            <button className="dock-action-btn" onClick={() => remove(f.id)} title="Remove">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
