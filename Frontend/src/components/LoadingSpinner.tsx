import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
  inline?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'LOADING SYSTEM...',
  fullPage = false,
  inline = false,
  className,
}) => {
  if (inline) {
    return <Loader2 size={16} className={cn('animate-spin text-foreground', className)} />;
  }

  if (fullPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background font-sans uppercase">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-foreground animate-spin"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary border-4 border-foreground animate-pulse"></div>
        </div>
        <p className="text-xl font-bold tracking-widest text-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 font-sans uppercase">
      <div className="w-12 h-12 border-4 border-foreground animate-spin"></div>
      <p className="text-sm font-bold tracking-widest text-foreground">{message}</p>
    </div>
  );
};
