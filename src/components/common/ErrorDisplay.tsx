// ============================================
// Error Display Component
// Reusable error state presentation
// ============================================

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ApiError } from '@/types';

interface ErrorDisplayProps {
  error: ApiError | null;
  onRetry?: () => void;
  title?: string;
}

export const ErrorDisplay = ({ 
  error, 
  onRetry,
  title = 'Something went wrong',
}: ErrorDisplayProps) => {
  if (!error) return null;

  return (
    <Card className="gradient-card shadow-soft border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error.message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
