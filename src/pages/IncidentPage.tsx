import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle, Clock, X, Save, FileWarning, Sparkles, ChevronDown, ChevronUp, AlertCircle, ListChecks, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';

interface Incident {
  id: string;
  incident_number: string;
  incident_type: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  incident_date: string;
  created_at: string;
  ai_analysis?: IncidentAnalysis;
}

interface FiveWhy { why: string; answer: string; }
interface CorrectiveAction { action: string; priority: string; timeframe: string; owner: string; }
interface IncidentAnalysis {
  fiveWhys: FiveWhy[];
  rootCause: string;
  rootCauseCode: string;
  correctiveActions: CorrectiveAction[];
  immediateActions: string[];
  investigationLevel: number;
  regulatoryNotification: boolean;
  notificationTimeframe?: string;
}

const INCIDENT_TYPES = ['injury', 'near_miss', 'property_damage', 'environmental', 'security', 'process_safety'];
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  injury: 'Injury', near_miss: 'Near Miss', property_damage: 'Property Damage',
  environmental: 'Environmental', security: 'Security', process_safety: 'Process Safety',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-yellow-100 text-yellow-700',
  action_required: 'bg-orange-100 text-orange-700',
  closed: 'bg-green-100 text-green-700',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'badge-risk-low', medium: 'badge-risk-medium', high: 'badge-risk-high', critical: 'badge-risk-critical',
};

const PRIORITY_COLORS: Record<string, string> = {
  immediate: 'bg-red-100 text-red-700',
  short_term: 'bg-orange-100 text-orange-700',
  medium_term: 'bg-yellow-100 text-yellow-700',
  long_term: 'bg-blue-100 text-blue-700',
};

export default function IncidentPage() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ incident_type: 'near_miss', title: '', description: '', location: '', severity: 'medium', incident_date: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('incident_reports').select('*').order('incident_date', { ascending: false });
    if (data) setIncidents(data as Incident[]);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const num = `INC-${Date.now().toString().slice(-6)}`;
    const { error } = await supabase.from('incident_reports').insert({
      ...form,
      incident_number: num,
      reported_by: user!.id,
      status: 'open',
    });
    if (!error) {
      setShowNew(false);
      setForm({ incident_type: 'near_miss', title: '', description: '', location: '', severity: 'medium', incident_date: '' });
      load();
    }
    setSaving(false);
  };

  const handleAnalyze = async (inc: Incident) => {
    setAnalyzingId(inc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ incidentId: inc.id, title: inc.title, description: inc.description, incidentType: inc.incident_type, severity: inc.severity, location: inc.location }),
      });
      const json = await res.json() as { success: boolean; data?: IncidentAnalysis };
      if (json.success && json.data) {
        setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, ai_analysis: json.data, status: 'investigating' } : i));
        setExpandedId(inc.id);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Incident Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Report incidents and run AI-powered 5-Why root cause analysis</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> Report Incident
        </button>
      </div>

      {showNew && (
        <div className="card p-4 border-red-200 bg-red-50/20 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-navy-900 font-semibold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /> Report Incident</h3>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Incident Title <span className="text-red-400">*</span></label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief description of what happened" required />
            </div>
            <div>
              <label className="label">Incident Type</label>
              <select className="input" value={form.incident_type} onChange={e => setForm(p => ({ ...p, incident_type: e.target.value }))}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Location <span className="text-red-400">*</span></label>
              <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Where did the incident occur?" required />
            </div>
            <div>
              <label className="label">Incident Date &amp; Time <span className="text-red-400">*</span></label>
              <input type="datetime-local" className="input" value={form.incident_date} onChange={e => setForm(p => ({ ...p, incident_date: e.target.value }))} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Detailed Description <span className="text-red-400">*</span></label>
              <textarea className="input min-h-[100px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what happened, conditions at the time, and any immediate actions taken..." required />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : incidents.length === 0 ? (
        <div className="card p-10 text-center"><FileWarning className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No incidents reported.</p></div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${inc.severity === 'critical' || inc.severity === 'high' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <AlertTriangle className={`w-5 h-5 ${inc.severity === 'critical' || inc.severity === 'high' ? 'text-red-600' : 'text-orange-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-flame-600 font-bold">{inc.incident_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[inc.status] ?? STATUS_STYLES.open}`}>{inc.status.replace('_', ' ')}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${SEVERITY_COLORS[inc.severity]}`}>{inc.severity}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{INCIDENT_TYPE_LABELS[inc.incident_type]}</span>
                    </div>
                    <h3 className="text-navy-900 font-semibold text-sm mt-1">{inc.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mt-0.5">{inc.description}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      <span>{inc.location}</span>
                      <span>{format(new Date(inc.incident_date || inc.created_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inc.status === 'closed' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                    {!inc.ai_analysis ? (
                      <button onClick={() => handleAnalyze(inc)} disabled={analyzingId === inc.id}
                        className="text-xs btn-primary py-1.5 px-2.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {analyzingId === inc.id ? 'Analysing…' : 'Analyse'}
                      </button>
                    ) : (
                      <button onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                        className="text-xs btn-secondary py-1.5 px-2.5 flex items-center gap-1">
                        <ListChecks className="w-3 h-3" />
                        {expandedId === inc.id ? 'Hide' : 'View Analysis'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {inc.ai_analysis && expandedId === inc.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4 animate-fade-in">
                  {inc.ai_analysis.regulatoryNotification && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span><strong>Regulatory Notification Required</strong>{inc.ai_analysis.notificationTimeframe ? ` — ${inc.ai_analysis.notificationTimeframe}` : ''}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-navy-800 uppercase tracking-wide mb-2">5-Why Root Cause Analysis</p>
                      <div className="space-y-2">
                        {inc.ai_analysis.fiveWhys.map((w, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-flame-100 text-flame-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <div>
                              <p className="text-xs text-gray-500 italic">{w.why}</p>
                              <p className="text-xs text-navy-700 font-medium mt-0.5">{w.answer}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Root Cause <span className="font-mono text-flame-600 ml-1">{inc.ai_analysis.rootCauseCode}</span></p>
                        <p className="text-xs text-navy-900">{inc.ai_analysis.rootCause}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {inc.ai_analysis.immediateActions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Immediate Actions</p>
                          <ul className="space-y-1">
                            {inc.ai_analysis.immediateActions.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                                <ArrowRight className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-navy-800 uppercase tracking-wide mb-2">Corrective Actions</p>
                        <div className="space-y-1.5">
                          {inc.ai_analysis.correctiveActions.map((ca, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PRIORITY_COLORS[ca.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {ca.priority.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-400">{ca.timeframe}</span>
                              </div>
                              <p className="text-xs text-navy-900">{ca.action}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Owner: {ca.owner}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Investigation Level: {inc.ai_analysis.investigationLevel} {['', '(Supervisor)', '(HSE Advisor)', '(HSE Manager + External)'][inc.ai_analysis.investigationLevel]}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={() => setExpandedId(null)} className="btn-secondary text-xs">Close Analysis</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
