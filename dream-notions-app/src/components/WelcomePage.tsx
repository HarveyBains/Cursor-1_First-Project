import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface WelcomePageProps {
  onAddDream?: () => void;
  onImportDreams?: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onAddDream, onImportDreams }) => {
  return (
    <Card className="max-w-xl mx-auto mt-12 shadow-lg">
      <CardContent className="py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to Dream-Notions!</h2>
        <p className="text-muted-foreground mb-4">
          Your personal space to record, organize, and reflect on your dreams. Dream-Notions helps you capture insights, track patterns, and grow your dream journal over time.
        </p>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">How to get started:</h3>
          <ul className="text-left mx-auto inline-block text-base text-muted-foreground list-disc list-inside">
            <li>Add your first dream using the <span className="font-medium text-primary">Add</span> button.</li>
            <li>Organize dreams with tags and favorites.</li>
            <li>Use the <span className="font-medium text-primary">Notepad</span> for ideas, todos, and planning.</li>
            <li>Import dreams from your clipboard or export your journal anytime.</li>
            <li>Explore features like search, sorting, and more as you go!</li>
          </ul>
        </div>
        <div className="space-y-3 mb-6">
          <Alert variant="default">
            <AlertTitle>Privacy First</AlertTitle>
            <AlertDescription>
              Your dreams are private and secure. Only you can access your journal.
            </AlertDescription>
          </Alert>
          <Alert variant="default">
            <AlertTitle>Import & Export</AlertTitle>
            <AlertDescription>
              You can import dreams from your clipboard or export your journal at any time for backup or sharing.
            </AlertDescription>
          </Alert>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onAddDream} className="w-full sm:w-auto" size="lg">Add First Dream</Button>
          <Button onClick={onImportDreams} variant="outline" className="w-full sm:w-auto" size="lg">Import Dreams</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomePage; 