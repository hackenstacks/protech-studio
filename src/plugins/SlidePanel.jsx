import { X } from 'lucide-react';

const PANEL_CLASS = {
  top:    'slide-top',
  bottom: 'slide-bottom',
  left:   'slide-left',
  right:  'slide-right',
};

export function SlidePanel({ id, isOpen, onClose, slideFrom = 'right', title, children }) {
  const posClass = PANEL_CLASS[slideFrom];

  return (
    <>
      {/* Backdrop — only for full-domain (top) panels */}
      {slideFrom === 'top' && (
        <div
          className={`slide-backdrop${isOpen ? ' slide-backdrop-open' : ''}`}
          onClick={onClose}
        />
      )}
      <div
        className={`slide-panel ${posClass}${isOpen ? ' slide-open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="slide-header">
          <span className="slide-title">{title}</span>
          <button className="slide-close" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>
        <div className="slide-body">
          {children}
        </div>
      </div>
    </>
  );
}
