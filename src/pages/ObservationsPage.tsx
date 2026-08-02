import { useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle, Clock, X, Save, Activity, Filter, Sparkles, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';
import type { Observation } from '../types';

const SEVERITY_BADGE: Record<string, string> = {
  low: 'badge-risk-low', medium: 'badge-risk-medium', high: 'badge-risk-high', critical: 'badge-risk-critical',
};

const OBS_TYPES = ['unsafe_act', 'unsafe_condition', 'near_miss', 'positive', 'environmental', 'security'];
const OBS_TYPE_LABELS: Record<string, string> = {
  unsafe_act: 'Unsafe Act', unsafe_condition: 'Unsafe Condition', near_miss: 'Near Miss',
  positive: 'Positive', environmental: 'Environmental', security: 'Security',
};

const AI_RECOMMENDATIONS: Record<string, Record<string, string>> = {
  unsafe_act: {
    critical: 'STOP WORK recommended. Brief all crew on the observed unsafe act immediately. Retrain the individual and re-verify competency before resuming. Raise a governance review.',
    high: 'Immediate supervisor intervention required. Conduct unplanned safety observation with the crew. Review and reinforce the relevant procedure within 24 hours.',
    medium: 'Issue a verbal safety notification to the individual. Include in next toolbox talk. Review relevant JSA step to ensure control is clearly stated.',
    low: 'Positive coaching opportunity. Discuss with individual privately. Note in weekly safety observation report.',
  },
  unsafe_condition: {
    critical: 'STOP WORK — barricade the area immediately. Assign a safety watch until the condition is corrected. Notify HSE Advisor and raise a PTW for correction work.',
    high: 'Barricade and sign the area. Issue a corrective action order with 24-hour deadline. Notify the Area Authority and HSE team.',
    medium: 'Assign corrective action to the responsible supervisor within 5 days. Verify completion with photographic evidence.',
    low: 'Log as a housekeeping action item. Review at end of shift. Assign to area crew.',
  },
  near_miss: {
    critical: 'Preserve the scene. Conduct Level 2 investigation within 24 hours. Notify HSE Manager. Suspend similar operations pending risk review.',
    high: 'Conduct Level 1 investigation within 4 hours. Share lessons with all crews on site. Review and update relevant JSA.',
    medium: 'Complete 5-Why analysis at end of shift. Share at next daily safety meeting. Update JSA if gap identified.',
    low: 'Log and brief the team. Confirm existing controls are adequate. File for trend analysis.',
  },
  positive: {
    critical: 'Excellent — document and share this behaviour as a best practice example across all crews. Nominate for NEPL Safety Recognition programme.',
    high: 'Recognise the individual publicly at the next safety meeting. Share as a positive example in the weekly HSE bulletin.',
    medium: 'Acknowledge the positive behaviour to the individual and team. Include in monthly safety statistics as a positive leading indicator.',
    low: 'Note in safety observation log. Share verbally with the crew as encouragement.',
  },
  environmental: {
    critical: 'Activate spill response immediately. Contain and prevent spread. Notify Environmental Manager and NOSDRA within 24 hours. Document all actions.',
    high: 'Deploy containment within 30 minutes. Notify Environmental Manager within 2 hours. Conduct root cause analysis.',
    medium: 'Log environmental observation. Assign corrective action to site supervisor within 48 hours. Review waste management procedures.',
    low: 'Note in environmental log. Include in monthly environmental report. Ensure proper disposal procedures are followed.',
  },
  security: {
    critical: 'Alert security team immediately. Preserve evidence. Notify OIM and Security Manager. Conduct security sweep of affected area.',
    high: 'Notify Security Manager within 1 hour. Increase security patrols in affected area. Review access control procedures.',
    medium: 'Log security observation. Review with Security Supervisor within 24 hours.',
    low: 'Note in security log. Include in weekly security report.',
  },
};

function getAIRecommendation(type: string, severity: string): string {
  const typeRecs = AI_RECOMMENDATIONS[type] ?? AI_RECOMMENDATIONS['unsafe_condition'];
  return typeRecs[severity] ?? typeRecs['medium'] ?? 'Review with your HSE Advisor and take appropriate corrective action.';
}

export default function ObservationsPage() {
  const { user } = useAuthStore();
  const [observations, setObservations] = useState<(Observation & { ai_recommendation_data?: { recommendation: string; generatedAt: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ observation_type: 'unsafe_condition', description: '', location: '', severity: 'medium', is_anonymous: false });

  useEffect(() => { load(); }, [filterType]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('observations').select('*').order('created_at', { ascending: false });
    if (filterType) q = q.eq('observation_type', filterType);
    const { data } = await q;
    if (data) setObservations(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const recommendation = getAIRecommendation(form.observation_type, form.severity);

    const { error } = await supabase.from('observations').insert({
      ...form,
      user_id: form.is_anonymous ? null : user!.id,
      status: 'open',
      ai_recommendation: recommendation,
      ai_recommendation_data: { recommendation, generatedAt: new Date().toISOString() },
    });

    if (!error) {
      setShowNew(false);
      setForm({ observation_type: 'unsafe_condition', description: '', location: '', severity: 'medium', is_anonymous: false });
      load();
    }
    setSaving(false);
  };

  const handleClose = async (id: string) => {
    await supabase.from('observations').update({ status: 'closed' }).eq('id', id);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Safety Observations</h1>
          <p className="text-gray-500 text-sm mt-0.5">Report observations and receive instant AI-powered corrective action recommendations</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> New Observation
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <button onClick={() => setFilterType(null)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filterType ? 'bg-flame-50 text-flame-700 border-flame-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>All</button>
        {OBS_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(filterType === t ? null : t)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === t ? 'bg-flame-50 text-flame-700 border-flame-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{OBS_TYPE_LABELS[t]}</button>
        ))}
      </div>

      {showNew && (
        <div className="card p-4 border-flame-200 bg-flame-50/20 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-navy-900 font-semibold text-sm">New Safety Observation</h3>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Observation Type</label>
              <select className="input" value={form.observation_type} onChange={e => setForm(p => ({ ...p, observation_type: e.target.value }))}>
                {OBS_TYPES.map(t => <option key={t} value={t}>{OBS_TYPE_LABELS[t]}</option>)}
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
              <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Pump Room B, Deck 3" required />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="anon" checked={form.is_anonymous} onChange={e => setForm(p => ({ ...p, is_anonymous: e.target.checked }))} className="rounded" />
              <label htmlFor="anon" className="text-sm text-gray-600 cursor-pointer">Submit anonymously</label>
            </div>
            <div className="md:col-span-2">
              <label className="label">Description <span className="text-red-400">*</span></label>
              <textarea className="input min-h-[100px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what you observed in detail..." required />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span><strong>AI Recommendation</strong> will be generated automatically based on observation type and severity.</span>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit Observation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : observations.length === 0 ? (
        <div className="card p-10 text-center"><Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No observations found.</p></div>
      ) : (
        <div className="space-y-2">
          {observations.map(obs => (
            <div key={obs.id} className="card p-4 hover:border-flame-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{OBS_TYPE_LABELS[obs.observation_type]}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${SEVERITY_BADGE[obs.severity]}`}>{obs.severity}</span>
                    {obs.status === 'closed' ? (
                      <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Closed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-600"><Clock className="w-3 h-3" /> Open</span>
                    )}
                    {obs.is_anonymous && <span className="text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />Anonymous</span>}
                  </div>
                  <p className="text-navy-900 text-sm mt-1.5 font-medium line-clamp-2">{obs.description}</p>
                  <div className="text-gray-400 text-xs mt-1">{obs.location} · {format(new Date(obs.created_at), 'dd MMM yyyy, HH:mm')}</div>

                  {obs.ai_recommendation && (
                    <div className="mt-2.5 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <Bot className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">{obs.ai_recommendation}</p>
                    </div>
                  )}
                </div>
                {obs.status === 'open' && (
                  <button onClick={() => handleClose(obs.id)} className="text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors">
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
