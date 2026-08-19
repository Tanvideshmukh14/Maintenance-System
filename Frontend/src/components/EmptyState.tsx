import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No requests yet',
  message = "You haven't raised any maintenance requests yet.",
  actionLabel = 'Raise Your First Request',
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <ClipboardList size={32} className="text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
      </div>
      {onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
