import React, { useState, useEffect, useRef } from 'react';
import { parseImportMarkdown } from '../utils/importExportUtils';
import { Button } from '@/components/ui/button';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dreams: any[]) => void; // Will be DreamEntry[] later
  onReset: () => void;
  hasDreams: boolean;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport, onReset, hasDreams }) => {
  const [importText, setImportText] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [parsedCount, setParsedCount] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 120, left: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      const width = 600;
      const height = 420;
      const top = Math.max(40, window.innerHeight / 2 - height / 2);
      const left = Math.max(40, window.innerWidth / 2 - width / 2);
      setPanelPos({ top, left });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - panelPos.left,
      y: e.clientY - panelPos.top,
    };
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPanelPos(_ => ({
        top: Math.max(0, e.clientY - dragOffset.current.y),
        left: Math.max(0, e.clientX - dragOffset.current.x),
      }));
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const handleImport = (): void => {
    if (!importText.trim()) {
      alert('Please paste your dream journal content');
      return;
    }

    setParseStatus('parsing');

    try {
      // Use the real parser for full dream titles
      const dreams = parseImportMarkdown(importText);
      
      if (dreams.length === 0) {
        setParseStatus('error');
        alert('No valid dreams found in the text. Please check the format.');
        return;
      }

      setParsedCount(dreams.length);
      setParseStatus('success');
      
      setTimeout(() => {
        onImport(dreams);
        setImportText('');
        setParseStatus('idle');
        setParsedCount(0);
        onClose();
      }, 1500);
      
    } catch (error) {
      setParseStatus('error');
      alert('Error parsing dreams. Please check the format and try again.');
    }
  };

  const handleClose = (): void => {
    setImportText('');
    setParseStatus('idle');
    setParsedCount(0);
    onClose();
  };

  const handleReset = (): void => {
    if (confirm('This will permanently delete all your dream records. This action cannot be undone. Are you sure?')) {
      onReset();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        zIndex: 1000,
        minWidth: 500,
        maxWidth: 700,
        width: 600,
        height: 500,
        minHeight: 320,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        cursor: dragging ? 'move' : 'default',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="bg-card border border-border shadow-lg rounded-lg p-0"
    >
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg cursor-move bg-muted border-b border-border"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-primary">Import Dreams</span>
        <Button size="icon" variant="ghost" onClick={handleClose} title="Close Import Dialog">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-auto">
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="# Dreams Journal Export
---
15/07/25 - Dream-Reflection4: Rephrase and Redesign your custom reality by expressing Vibes to shape it the way you want
---
15/07/25 - Dream-3-Reflection: Vibe Coding, Tags: #default
Maybe this was a a response from the Unknown about the question I had as I went to sleep."
          className="w-full flex-1 px-3 py-2 border border-border rounded bg-muted/20 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none mb-4"
          disabled={parseStatus === 'parsing'}
        />
        {parseStatus === 'success' && (
          <div className="px-3 py-2 bg-green-500/10 text-green-500 rounded text-sm mb-2">
            ✅ Found {parsedCount} dreams! Adding to your collection...
          </div>
        )}
        {parseStatus === 'parsing' && (
          <div className="px-3 py-2 bg-primary/10 text-primary rounded text-sm mb-2">
            🔄 Parsing dreams...
          </div>
        )}
        <div className="flex gap-3 pt-2 mt-auto justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasDreams || parseStatus === 'parsing'}
            className="border-red-500/20 text-red-500 hover:bg-red-500/10"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete All
          </Button>
          <Button
            onClick={handleImport}
            disabled={parseStatus === 'parsing' || !importText.trim()}
            type="submit"
          >
            {parseStatus === 'success' ? '✅ Importing...' : parseStatus === 'parsing' ? '🔄 Parsing...' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
