import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequestStatus } from '../types';

interface StatusBadgeProps {
  status: RequestStatus;
}

const STATUS_CONFIG: Record<RequestStatus, {
  label: string;
  Icon: React.ElementType;
  cls: string;
}> = {
  Pending: {
    label: 'Pending',
    Icon: Clock,
    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5',
  },
  'In Progress': {
    label: 'In Progress',
    Icon: Loader2,
    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5',
  },
  Resolved: {
    label: 'Resolved',
    Icon: CheckCircle2,
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5',
  },
  Escalated: {
    label: 'Escalated',
    Icon: AlertTriangle,
    cls: 'bg-destructive/10 text-destructive border border-destructive/20 shadow-sm shadow-destructive/10',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-sans backdrop-blur-md transition-colors',
        cfg.cls
      )}
    >
      <cfg.Icon size={14} className={status === 'In Progress' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};
