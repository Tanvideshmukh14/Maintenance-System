import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceRequest } from '../types';
import { StatusBadge } from './StatusBadge';

interface RequestCardProps {
  request: MaintenanceRequest;
  linkPrefix?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-destructive',
  Medium: 'text-orange-500',
  Low: 'text-emerald-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const RequestCard: React.FC<RequestCardProps> = ({ request, linkPrefix = '/employee' }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`${linkPrefix}/request/${request.id}`)}
      className={cn(
        'cursor-pointer group relative bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl hover:border-primary/50 hover:bg-card/80 hover:shadow-xl transition-all duration-300 ease-out font-sans overflow-hidden shadow-sm',
        request.status === 'Escalated' && 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive hover:shadow-destructive/20'
      )}
    >
      <div className="p-4 sm:p-6 flex flex-col gap-4 relative z-10">
        
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-medium text-xs bg-muted/50 px-2 py-1 rounded-md">
              #{request.id}
            </span>
            <span className="border border-border/50 font-medium text-xs px-2.5 py-1 rounded-md bg-background/50 text-foreground group-hover:border-primary/50 transition-colors">
              {request.category}
            </span>
            <span className={cn('font-semibold text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/30 border border-border/30', PRIORITY_COLOR[request.priority])}>
              <div className={cn("w-1.5 h-1.5 rounded-full bg-current")}></div>
              {request.priority}
            </span>
          </div>
          
          <div className="shrink-0 flex items-center gap-3">
             <StatusBadge status={request.status} />
             <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 transform group-hover:scale-110">
               <ArrowUpRight size={16} />
             </div>
          </div>
        </div>

        {/* Title & Desc */}
        <div>
          <h3 className={cn("font-bold text-xl sm:text-2xl tracking-tight mb-2 text-foreground line-clamp-1", request.status === 'Escalated' && 'text-destructive')}>
            {request.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed">
            {request.description}
          </p>
        </div>

        {/* Footer info */}
        <div className={cn("flex items-center justify-between text-xs font-medium pt-4 border-t border-border/50 mt-2 text-muted-foreground", request.status === 'Escalated' && 'border-destructive/20')}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
              <Calendar size={14} /> {formatDate(request.created_at)}
            </span>
            {request.assigned_to && (
              <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md text-foreground/80">
                <User2 size={14} /> {request.assigned_to}
              </span>
            )}
          </div>
          {request.status === 'Escalated' && (
            <span className="animate-pulse bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded-md font-semibold text-[10px] uppercase tracking-wider">
              Action Req.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
