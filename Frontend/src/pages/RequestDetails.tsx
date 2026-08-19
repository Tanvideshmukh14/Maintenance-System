import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Calendar, User2, BarChart2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceRequest, User } from '../types';
import { getRequestById } from '../services/api';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-destructive',
  Medium: 'text-orange-500',
  Low: 'text-emerald-500',
};

const CATEGORY_STYLE: Record<string, string> = {
  IT: 'bg-background text-foreground border-foreground',
  Facilities: 'bg-background text-foreground border-foreground',
  Infrastructure: 'bg-background text-foreground border-foreground',
};

const STATUS_FLOW = ['Pending', 'In Progress', 'Resolved'] as const;

function getProgress(status: string) {
  if (status === 'Pending') return 12;
  if (status === 'In Progress') return 55;
  if (status === 'Resolved') return 100;
  return 70; // Escalated
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 py-4 border-b-4 border-foreground last:border-0">
    <div className="w-8 h-8 border-2 border-foreground flex items-center justify-center shrink-0">
      <span className="text-foreground">{icon}</span>
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <div className="text-lg font-bold">{value}</div>
    </div>
  </div>
);

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backPath = user?.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    setUser(JSON.parse(stored));
    if (!id) return;
    getRequestById(Number(id))
      .then((d) => setRequest(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load request.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-sans uppercase text-foreground">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <button
          className="flex items-center gap-2 mb-8 text-sm font-bold tracking-widest hover:bg-foreground hover:text-background border-2 border-transparent hover:border-foreground px-4 py-2 transition-colors"
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft size={16} /> RETURN TO DASHBOARD
        </button>

        {loading ? (
           <LoadingSpinner fullPage={false} message="FETCHING RECORD..." />
        ) : error ? (
          <div className="border-4 border-destructive p-6 bg-destructive/10">
            <h2 className="font-bold text-destructive text-xl mb-2">SYSTEM ERROR</h2>
            <p className="text-destructive font-bold">{error}</p>
          </div>
        ) : request ? (
          <>
            {request.status === 'Escalated' && (
              <div className="mb-8 border-4 border-destructive bg-destructive/10 p-6 flex items-start gap-4">
                <AlertTriangle size={32} className="text-destructive animate-pulse shrink-0" />
                <div>
                  <h3 className="text-destructive font-bold tracking-tighter text-2xl mb-1">ESCALATED STATUS</h3>
                  <p className="text-destructive font-bold">
                    {request.escalation_reason || 'THIS REQUEST WAS ESCALATED DUE TO EXCEEDING RESOLUTION THRESHOLD.'}
                  </p>
                </div>
              </div>
            )}

            <div className="border-4 border-foreground bg-background mb-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
              <div className="border-b-4 border-foreground p-6 sm:p-8 bg-foreground text-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-sm font-bold tracking-widest bg-background text-foreground px-3 py-1 flex items-center gap-1">
                      <Hash size={14} />{request.id}
                    </span>
                    <span className="text-sm font-bold tracking-widest border-2 border-background px-3 py-1">
                      {request.category}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter leading-none">{request.title}</h1>
                </div>
                <div className="shrink-0 scale-125 origin-left">
                  <StatusBadge status={request.status} />
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-10">
                  <p className="text-sm font-bold tracking-widest opacity-60 mb-4 border-l-4 border-foreground pl-2">DESCRIPTION / LOG</p>
                  <p className="text-xl sm:text-2xl font-medium leading-snug normal-case">{request.description}</p>
                </div>

                {/* Progress */}
                <div className="mb-10 border-4 border-foreground p-6">
                  <div className="flex justify-between mb-4">
                    <p className="text-sm font-bold tracking-widest">RESOLUTION PROGRESS</p>
                    <p className="text-sm font-bold">{getProgress(request.status)}%</p>
                  </div>
                  <div className="h-4 border-2 border-foreground bg-background overflow-hidden relative">
                     <div 
                       className={cn("h-full", request.status === 'Escalated' ? 'bg-destructive' : 'bg-primary')} 
                       style={{ width: `${getProgress(request.status)}%` }} 
                     />
                  </div>
                </div>

                <div className="border-4 border-foreground bg-muted/20 p-6">
                  <Row icon={<BarChart2 size={16} />} label="Priority" value={
                    <span className={cn('font-bold', PRIORITY_COLOR[request.priority])}>
                      {request.priority}
                    </span>
                  } />
                  <Row icon={<User2 size={16} />} label="Assigned Technician" value={
                    request.assigned_to ?? <span className="opacity-30">UNASSIGNED</span>
                  } />
                  <Row icon={<Calendar size={16} />} label="Created" value={formatDateTime(request.created_at)} />
                  <Row icon={<Clock size={16} />} label="Last Updated" value={formatDateTime(request.updated_at)} />
                  {request.employee_name && (
                    <Row icon={<User2 size={16} />} label="Submitted By" value={request.employee_name} />
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-4 border-foreground p-6 sm:p-8 bg-background">
              <h2 className="text-2xl font-bold tracking-tighter mb-8 flex items-center gap-3">
                <CheckCircle2 size={24} /> RESOLUTION PATH
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                {STATUS_FLOW.map((s, i) => {
                  const isActive = request.status === s;
                  const isPast = request.status !== 'Escalated' &&
                    STATUS_FLOW.indexOf(request.status as typeof STATUS_FLOW[number]) > i;
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-2">
                        <div className={cn(
                          'w-12 h-12 flex items-center justify-center border-4 font-bold text-xl transition-all',
                          isActive ? 'bg-foreground border-foreground text-background' : isPast ? 'bg-primary border-foreground text-foreground' : 'bg-background border-muted text-muted-foreground'
                        )}>
                          {isPast ? (
                            <CheckCircle2 size={20} className="text-foreground" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span className={cn('text-sm font-bold tracking-widest', isActive ? 'text-foreground' : isPast ? 'text-foreground' : 'text-muted-foreground')}>
                          {s}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={cn('w-1 mx-4 sm:mx-0 sm:flex-1 sm:h-2 h-12 my-2 sm:my-0 border-2', isPast ? 'bg-primary border-foreground' : 'bg-muted border-muted')} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {request.status === 'Escalated' && (
                <div className="mt-8 border-4 border-destructive bg-destructive/10 p-4 flex items-center gap-4 text-destructive font-bold">
                  <AlertTriangle size={24} className="animate-pulse" />
                  THIS REQUEST HAS BEEN ESCALATED AND REQUIRES ADMIN REVIEW.
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default RequestDetails;
