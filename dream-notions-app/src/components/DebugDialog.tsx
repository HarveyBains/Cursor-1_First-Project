
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DebugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  debugLogs: string[];
  onClearLogs: () => void;
  onCopyDebug: () => void;
  userInfo: {
    status: string;
    dreamsCount: number;
    dataSource: string;
    userId: string;
  };
}

const DebugDialog: React.FC<DebugDialogProps> = ({
  isOpen,
  onClose,
  debugLogs,
  onClearLogs,
  onCopyDebug,
  userInfo,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full mx-4 p-6 text-foreground">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                <path d="M12 4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
              </svg>
              Debug Console
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          <Button
            onClick={onClearLogs}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
          <Button
            onClick={onCopyDebug}
            variant="outline"
            size="sm"
            title="Copy debug info to clipboard"
          >
            📋 Copy
          </Button>
          <DialogClose asChild>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          </DialogClose>
        </div>
        <div className="bg-muted/50 rounded-lg border border-border p-4 max-h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <strong className="text-foreground">User Status:</strong>
              <Badge variant="default">{userInfo.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <strong className="text-foreground">Dreams Count:</strong>
              <Badge variant="secondary">{userInfo.dreamsCount}</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <strong className="text-foreground">Data Source:</strong>
              <Badge variant="outline">{userInfo.dataSource}</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <strong className="text-foreground">User ID:</strong>
              <Badge variant="outline">{userInfo.userId}</Badge>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <strong className="text-sm text-foreground">Logs:</strong>
            <ScrollArea className="mt-2 max-h-48">
              <div className="space-y-1.5 font-mono text-xs">
                {debugLogs.length === 0 ? (
                  <div className="text-muted-foreground italic">No logs yet...</div>
                ) : (
                  debugLogs.slice(-50).reverse().map((log, index) => (
                    <div key={index} className="text-muted-foreground break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebugDialog;
