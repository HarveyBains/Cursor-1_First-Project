import React, { useState } from 'react';
import { parseImportMarkdown } from '../utils/importExportUtils';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-primary/20 rounded-lg p-5 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">
            Dream Import Panel
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Please paste in your dream journal content here. These dreams will be added to your existing collection."
              className="w-full h-64 px-3 py-2 border border-border rounded bg-muted/20 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              disabled={parseStatus === 'parsing'}
            />
          </div>

          {parseStatus === 'success' && (
            <div className="px-3 py-2 bg-green-500/10 text-green-500 rounded text-sm">
              ✅ Found {parsedCount} dreams! Adding to your collection...
            </div>
          )}

          {parseStatus === 'parsing' && (
            <div className="px-3 py-2 bg-primary/10 text-primary rounded text-sm">
              🔄 Parsing dreams...
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReset}
              disabled={!hasDreams || parseStatus === 'parsing'}
              className={`flex-1 px-4 py-2 rounded transition-colors font-medium flex items-center justify-center gap-2 ${
                !hasDreams || parseStatus === 'parsing'
                  ? 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={parseStatus === 'parsing'}
              className="flex-1 px-4 py-2 bg-muted/20 hover:bg-muted/30 text-foreground rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parseStatus === 'parsing' || !importText.trim()}
              className={`flex-1 px-4 py-2 rounded transition-colors font-medium ${
                parseStatus === 'success'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : parseStatus === 'parsing'
                  ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {parseStatus === 'success' ? '✅ Importing...' : parseStatus === 'parsing' ? '🔄 Parsing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
