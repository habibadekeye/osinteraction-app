import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, TrendingUp, Activity, Clock, Users, ShieldCheck, MessageSquare, BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';

interface DashboardStats {
  openPTW: number;
  pendingObservations: number;
  knowledgeDocs: number;
  chatSessions: number;
  activeIncidents: number;
  governanceReviews: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  created_at: string;
  severity?: string;
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({ openPTW: 0, pendingObservations: 0, knowledgeDocs: 0, chatSessions: 0, activeIncidents: 0, governanceReviews: 0 });
  const [recentObs, setRecentObs] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const [ptw, obs, docs, chat, incidents, gov] = await Promise.all([
        supabase.from('permit_to_work').select('id', { count: 'exact', head: true }).in('status', ['pending', 'approved']),
        supabase.from('observations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('incident_reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
        supabase.from('governance_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({
        openPTW: ptw.count ?? 0,
        pendingObservations: obs.count ?? 0,
        knowledgeDocs: docs.count ?? 0,
        chatSessions: chat.count ?? 0,
        activeIncidents: incidents.count ?? 0,
        governanceReviews: gov.count ?? 0,
      });

      const { data: obsData } = await supabase.from('observations').select('id, observation_type, description, created_at, severity').order('created_at', { ascending: false }).limit(5);
      if (obsData) setRecentObs(obsData.map(o => ({ id: o.id, type: o.observation_type, title: o.description?.slice(0, 60) + (o.description?.length > 60 ? '...' : '') || 'Observation', created_at: o.created_at, severity: o.severity })));
      setLoading(false);
    };
    loadDashboard();
  }, []);

  const statCards = [
    { label: 'Active PTW', value: stats.openPTW, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Open Observations', value: stats.pendingObservations, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Knowledge Docs', value: stats.knowledgeDocs, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'AI Conversations', value: stats.chatSessions, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Active Incidents', value: stats.activeIncidents, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Governance Queue', value: stats.governanceReviews, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')} &mdash; {user?.location}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-700 text-xs font-medium">Systems Operational</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`card p-4 border ${card.border}`}>
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            {loading ? (
              <div className="h-7 w-12 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            )}
            <div className="text-gray-500 text-xs">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent observations */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-navy-900 font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-flame-500" /> Recent Observations</h3>
            <a href="/observations" className="text-flame-600 text-xs hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></a>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : recentObs.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No recent observations</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentObs.map(obs => (
                <div key={obs.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-navy-900 text-xs font-medium truncate">{obs.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{obs.type} &middot; {format(new Date(obs.created_at), 'dd MMM, HH:mm')}</p>
                  </div>
                  {obs.severity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${RISK_COLOR[obs.severity] || RISK_COLOR.low}`}>{obs.severity}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-4 space-y-3">
          <h3 className="text-navy-900 font-semibold text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-flame-500" /> Quick Actions</h3>
          {[
            { label: 'Ask AI Assistant', desc: 'HSE guidance on demand', href: '/chat', color: 'bg-indigo-500' },
            { label: 'New Observation', desc: 'Report a safety finding', href: '/observations', color: 'bg-blue-500' },
            { label: 'Emergency Procedures', desc: 'Access emergency cards', href: '/emergency', color: 'bg-red-500' },
            { label: 'Knowledge Library', desc: 'Browse procedures & SOPs', href: '/knowledge', color: 'bg-green-500' },
          ].map(action => (
            <a key={action.label} href={action.href} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group border border-gray-100">
              <div className={`w-2 h-8 rounded-full ${action.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-navy-900 text-xs font-semibold">{action.label}</div>
                <div className="text-gray-400 text-xs">{action.desc}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-flame-500 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* System status bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" />
              <span>Role: <span className="font-semibold text-navy-900">{user?.role?.replace('_', ' ').toUpperCase()}</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Asset: <span className="font-semibold text-navy-900">{user?.asset_type?.toUpperCase()}</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dept: <span className="font-semibold text-navy-900">{user?.department}</span></span>
            </div>
          </div>
          <div className="text-xs text-gray-400">HSE OPS AI v1.0 &middot; NEPL HSE Division</div>
        </div>
      </div>
    </div>
  );
}
