import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity, MessageSquare, FileText, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  totalChats: number;
  totalObservations: number;
  openObservations: number;
  totalPTW: number;
  approvedPTW: number;
  totalIncidents: number;
  openIncidents: number;
  governancePending: number;
  obsBreakdown: { type: string; count: number }[];
  riskBreakdown: { level: string; count: number }[];
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [chats, obs, allObs, ptw, approvedPtw, incidents, openInc, gov, obsTypes, riskLevels] = await Promise.all([
        supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('observations').select('id', { count: 'exact', head: true }),
        supabase.from('observations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('permit_to_work').select('id', { count: 'exact', head: true }),
        supabase.from('permit_to_work').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('incident_reports').select('id', { count: 'exact', head: true }),
        supabase.from('incident_reports').select('id', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
        supabase.from('governance_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('observations').select('observation_type'),
        supabase.from('observations').select('severity'),
      ]);

      const obsTypeCounts: Record<string, number> = {};
      (obsTypes.data || []).forEach((o: { observation_type: string }) => { obsTypeCounts[o.observation_type] = (obsTypeCounts[o.observation_type] || 0) + 1; });

      const riskCounts: Record<string, number> = {};
      (riskLevels.data || []).forEach((o: { severity: string }) => { riskCounts[o.severity] = (riskCounts[o.severity] || 0) + 1; });

      setData({
        totalChats: chats.count ?? 0,
        totalObservations: obs.count ?? 0,
        openObservations: allObs.count ?? 0,
        totalPTW: ptw.count ?? 0,
        approvedPTW: approvedPtw.count ?? 0,
        totalIncidents: incidents.count ?? 0,
        openIncidents: openInc.count ?? 0,
        governancePending: gov.count ?? 0,
        obsBreakdown: Object.entries(obsTypeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        riskBreakdown: Object.entries(riskCounts).map(([level, count]) => ({ level, count })).sort((a, b) => b.count - a.count),
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
      </div>
    );
  }

  if (!data) return null;

  const metricCards = [
    { label: 'AI Conversations', value: data.totalChats, icon: MessageSquare, color: 'text-flame-600', bg: 'bg-flame-50' },
    { label: 'Total Observations', value: data.totalObservations, sub: `${data.openObservations} open`, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Permit to Work', value: data.totalPTW, sub: `${data.approvedPTW} approved`, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Incidents', value: data.totalIncidents, sub: `${data.openIncidents} active`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const maxObsCount = Math.max(...data.obsBreakdown.map(o => o.count), 1);
  const maxRiskCount = Math.max(...data.riskBreakdown.map(r => r.count), 1);

  const OBS_TYPE_LABELS: Record<string, string> = {
    unsafe_act: 'Unsafe Act', unsafe_condition: 'Unsafe Condition', near_miss: 'Near Miss', positive: 'Positive', environmental: 'Environmental', security: 'Security',
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Analytics & Reporting</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform-wide HSE performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{card.label}</div>
            {card.sub && <div className="text-gray-400 text-xs">{card.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Observation type breakdown */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-flame-500" />
            <h3 className="text-navy-900 font-semibold text-sm">Observations by Type</h3>
          </div>
          {data.obsBreakdown.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-8">No data yet</div>
          ) : (
            <div className="space-y-3">
              {data.obsBreakdown.map(({ type, count }) => (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{OBS_TYPE_LABELS[type] || type}</span>
                    <span className="font-semibold text-navy-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-flame-500 rounded-full transition-all" style={{ width: `${(count / maxObsCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk level breakdown */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-flame-500" />
            <h3 className="text-navy-900 font-semibold text-sm">Observations by Severity</h3>
          </div>
          {data.riskBreakdown.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-8">No data yet</div>
          ) : (
            <div className="space-y-3">
              {data.riskBreakdown.map(({ level, count }) => (
                <div key={level}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 capitalize">{level}</span>
                    <span className="font-semibold text-navy-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${RISK_COLORS[level] || 'bg-gray-400'}`} style={{ width: `${(count / maxRiskCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{data.approvedPTW}</div>
            <div className="text-xs text-gray-500">PTW Approvals</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{data.governancePending}</div>
            <div className="text-xs text-gray-500">Governance Reviews Pending</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{data.totalObservations > 0 ? Math.round((1 - data.openObservations / data.totalObservations) * 100) : 0}%</div>
            <div className="text-xs text-gray-500">Observation Close Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
