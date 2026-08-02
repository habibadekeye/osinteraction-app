import { useState, useEffect } from 'react';
import { Plus, ChevronRight, AlertTriangle, CheckCircle, Clock, X, Sparkles, ChevronDown, ChevronUp, Printer, AlertCircle, ShieldCheck, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';
import type { RiskAssessment, RiskAssessmentStep } from '../types';

const RISK_MATRIX: Record<string, string> = {
  '1-1': 'low', '1-2': 'low', '1-3': 'low', '1-4': 'low', '1-5': 'medium',
  '2-1': 'low', '2-2': 'low', '2-3': 'medium', '2-4': 'medium', '2-5': 'high',
  '3-1': 'low', '3-2': 'medium', '3-3': 'medium', '3-4': 'high', '3-5': 'high',
  '4-1': 'low', '4-2': 'medium', '4-3': 'high', '4-4': 'high', '4-5': 'critical',
  '5-1': 'medium', '5-2': 'high', '5-3': 'high', '5-4': 'critical', '5-5': 'critical',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const RISK_DOT: Record<string, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500',
};

const WORK_TYPES = [
  { value: 'hot_work', label: 'Hot Work' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'lifting', label: 'Lifting Operations' },
  { value: 'electrical', label: 'Electrical Isolation' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'general', label: 'General Activity' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-gray-200 text-gray-500',
};

interface GeneratedRA {
  assessment: RiskAssessment;
  steps: RiskAssessmentStep[];
  overall_risk_rating: string;
  residual_risk_rating: string;
}

const EMPTY_FORM = { title: '', activityDescription: '', location: '', workType: 'general', assessmentType: 'JSA' as const, crewExperience: 'mixed' };

export default function RiskAssessmentPage() {
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedRA | null>(null);
  const [expandedNewStep, setExpandedNewStep] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<RiskAssessmentStep[]>([]);
  const [expandedListStep, setExpandedListStep] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('risk_assessments').select('*').order('created_at', { ascending: false });
    if (data) setAssessments(data);
    setLoading(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setGenerated(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-risk-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { success: boolean; data?: GeneratedRA; error?: { message: string } };
      if (!json.success || !json.data) throw new Error(json.error?.message ?? 'Generation failed');
      setGenerated(json.data);
      setExpandedNewStep(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalise = async () => {
    if (!generated) return;
    await supabase.from('risk_assessments').update({ status: 'completed' }).eq('id', generated.assessment.id);
    setGenerated(null);
    setShowNew(false);
    setForm(EMPTY_FORM);
    load();
  };

  const loadSteps = async (assessmentId: string) => {
    if (expandedId === assessmentId) { setExpandedId(null); setExpandedSteps([]); return; }
    const { data } = await supabase.from('risk_assessment_steps').select('*').eq('assessment_id', assessmentId).order('step_number');
    setExpandedSteps(data ?? []);
    setExpandedId(assessmentId);
    setExpandedListStep(null);
  };

  const handlePrint = (ra: RiskAssessment, steps: RiskAssessmentStep[]) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rc = (r: string) => ({ low: '#16a34a', medium: '#ca8a04', high: '#ea580c', critical: '#dc2626' })[r] ?? '#6b7280';
    w.document.write(`<!DOCTYPE html><html><head><title>JSA — ${ra.title}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px}h1{font-size:16px;margin:0 0 4px}h2{font-size:12px;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}.meta{color:#555;margin-bottom:12px}.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:bold;color:white}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#f3f4f6;text-align:left;padding:6px;font-size:10px;border:1px solid #ddd}td{padding:6px;border:1px solid #ddd;vertical-align:top;font-size:10px}tr:nth-child(even){background:#fafafa}ul{margin:0;padding-left:14px}li{margin-bottom:2px}@media print{body{margin:10px}}</style>
</head><body>
<h1>Job Safety Analysis — ${ra.title}</h1>
<div class="meta">Location: ${ra.location ?? '—'} | Type: ${ra.assessment_type} | Date: ${format(new Date(ra.created_at), 'dd MMM yyyy')} | Overall: <span class="badge" style="background:${rc(ra.overall_risk_rating ?? 'medium')}">${(ra.overall_risk_rating ?? 'medium').toUpperCase()}</span> Residual: <span class="badge" style="background:${rc(ra.residual_risk_rating ?? 'low')}">${(ra.residual_risk_rating ?? 'low').toUpperCase()}</span></div>
${ra.activity_description ? `<p><strong>Activity:</strong> ${ra.activity_description}</p>` : ''}
<h2>JSA Steps</h2>
<table><tr><th width="4%">#</th><th width="20%">Activity Step</th><th width="22%">Hazards</th><th width="8%">Pre-Risk</th><th width="28%">Control Measures</th><th width="8%">Post-Risk</th><th width="10%">Responsible</th></tr>
${steps.map(s => `<tr><td>${s.step_number}</td><td><strong>${s.activity_step}</strong></td><td><ul>${s.hazards.map(h => `<li>${h}</li>`).join('')}</ul></td><td><span class="badge" style="background:${rc(s.risk_before_rating)}">${(s.risk_before_rating ?? '').toUpperCase()}</span><br/>${s.risk_before_likelihood}×${s.risk_before_severity}</td><td><ul>${s.control_measures.map(c => `<li>${c}</li>`).join('')}</ul></td><td><span class="badge" style="background:${rc(s.risk_after_rating)}">${(s.risk_after_rating ?? '').toUpperCase()}</span><br/>${s.risk_after_likelihood}×${s.risk_after_severity}</td><td>${s.responsible_person}</td></tr>`).join('')}
</table>
<p style="color:#888;font-size:9px">HSE OPS AI — NEPL HSE. Verify with HSE Advisor before commencing work. | Printed: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const StepRow = ({ step, idx, expanded, onToggle }: { step: RiskAssessmentStep; idx: number; expanded: boolean; onToggle: () => void }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors">
        <span className="w-6 h-6 rounded-full bg-flame-100 text-flame-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{step.step_number}</span>
        <span className="flex-1 text-navy-900 text-xs font-medium">{step.activity_step}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${RISK_DOT[step.risk_before_rating]}`} />
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <div className={`w-2 h-2 rounded-full ${RISK_DOT[step.risk_after_rating]}`} />
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 bg-gray-50/50">
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Hazards</p>
            <ul className="space-y-1">{step.hazards.map((h, j) => <li key={j} className="flex items-start gap-1.5 text-xs text-gray-700"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{h}</li>)}</ul>
            <p className="text-xs text-gray-400 mt-2">Pre-control: L{step.risk_before_likelihood} × S{step.risk_before_severity} = <span className={`px-1.5 rounded border ${RISK_COLORS[step.risk_before_rating]}`}>{step.risk_before_rating}</span></p>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Control Measures</p>
            <ul className="space-y-1">{step.control_measures.map((c, j) => <li key={j} className="flex items-start gap-1.5 text-xs text-gray-700"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>Post: L{step.risk_after_likelihood} × S{step.risk_after_severity} = <span className={`px-1.5 rounded border ${RISK_COLORS[step.risk_after_rating]}`}>{step.risk_after_rating}</span></span>
              <span>· <span className="text-navy-700 font-medium">{step.responsible_person}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Risk Assessments</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-generated JSA/TRA with step-by-step hazard analysis and PDF export</p>
        </div>
        <button onClick={() => { setShowNew(true); setGenerated(null); setError(''); }} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      {showNew && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-navy-900 font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-flame-500" /> AI-Generated Risk Assessment</h3>
            <button onClick={() => { setShowNew(false); setGenerated(null); setError(''); setForm(EMPTY_FORM); }}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {error && <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}</div>}

          {!generated ? (
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Assessment Title <span className="text-red-400">*</span></label>
                <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., JSA — Crane Lift of 5-tonne Pump, Deck B" required />
              </div>
              <div>
                <label className="label">Work Type</label>
                <select className="input" value={form.workType} onChange={e => setForm(p => ({ ...p, workType: e.target.value }))}>
                  {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Assessment Type</label>
                <select className="input" value={form.assessmentType} onChange={e => setForm(p => ({ ...p, assessmentType: e.target.value as 'JSA' | 'TRA' }))}>
                  <option value="JSA">JSA — Job Safety Analysis</option>
                  <option value="TRA">TRA — Task Risk Assessment</option>
                </select>
              </div>
              <div>
                <label className="label">Location <span className="text-red-400">*</span></label>
                <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Bonga FPSO, Deck B, Frame 45" required />
              </div>
              <div>
                <label className="label">Crew Experience</label>
                <select className="input" value={form.crewExperience} onChange={e => setForm(p => ({ ...p, crewExperience: e.target.value }))}>
                  <option value="new">New / Inexperienced</option>
                  <option value="mixed">Mixed</option>
                  <option value="experienced">Experienced</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Activity Description <span className="text-red-400">*</span></label>
                <textarea className="input min-h-[80px] resize-none" value={form.activityDescription} onChange={e => setForm(p => ({ ...p, activityDescription: e.target.value }))} placeholder="Describe the work activity — what will be done, equipment involved, expected duration..." required />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowNew(false); setForm(EMPTY_FORM); }} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={generating} className="btn-primary text-sm">
                  <Sparkles className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate JSA with AI'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> {generated.steps.length}-step JSA generated — review each step, then finalise
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-navy-900 font-semibold text-sm">{generated.assessment.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    {generated.assessment.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{generated.assessment.location}</span>}
                    <span>Overall: <span className={`font-medium px-1.5 py-0.5 rounded border ${RISK_COLORS[generated.overall_risk_rating]}`}>{generated.overall_risk_rating}</span></span>
                    <span>Residual: <span className={`font-medium px-1.5 py-0.5 rounded border ${RISK_COLORS[generated.residual_risk_rating]}`}>{generated.residual_risk_rating}</span></span>
                  </div>
                </div>
                <button onClick={() => handlePrint(generated.assessment, generated.steps)} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
              </div>
              <div className="space-y-2">
                {generated.steps.map((step, i) => (
                  <StepRow key={i} step={step} idx={i} expanded={expandedNewStep === i} onToggle={() => setExpandedNewStep(expandedNewStep === i ? null : i)} />
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button onClick={() => { setGenerated(null); setForm(EMPTY_FORM); }} className="btn-secondary text-xs">Generate New</button>
                <div className="flex gap-2">
                  <button onClick={() => handlePrint(generated.assessment, generated.steps)} className="btn-secondary text-xs flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Export PDF</button>
                  <button onClick={handleFinalise} className="btn-primary text-xs flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Finalise Assessment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card p-4">
        <h3 className="text-navy-900 font-semibold text-xs uppercase tracking-wider mb-3">NEPL 5×5 Risk Matrix (Likelihood × Severity)</h3>
        <div className="overflow-x-auto">
          <table className="text-xs w-full max-w-xs">
            <thead><tr><th className="text-gray-400 font-medium p-1 text-left">L\S</th>{[1,2,3,4,5].map(s => <th key={s} className="text-gray-500 font-medium p-1 text-center w-10">{s}</th>)}</tr></thead>
            <tbody>{[5,4,3,2,1].map(l => (<tr key={l}><td className="text-gray-500 font-medium p-1">{l}</td>{[1,2,3,4,5].map(s => { const r = RISK_MATRIX[`${l}-${s}`] ?? 'low'; return <td key={s} className={`p-1 text-center rounded font-medium ${RISK_COLORS[r]}`}>{r[0].toUpperCase()}</td>; })}</tr>))}</tbody>
          </table>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-gray-50" />)}</div>
      ) : assessments.length === 0 ? (
        <div className="card p-10 text-center"><AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No risk assessments yet. Generate your first AI-powered JSA.</p></div>
      ) : (
        <div className="space-y-2">
          {assessments.map(ra => (
            <div key={ra.id} className="card overflow-hidden">
              <button onClick={() => loadSteps(ra.id)} className="w-full p-4 hover:bg-gray-50/50 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-navy-900 font-semibold text-sm">{ra.title}</h3>
                      {ra.overall_risk_rating && <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_COLORS[ra.overall_risk_rating]}`}>{ra.overall_risk_rating}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ra.status] ?? STATUS_STYLES.draft}`}>{ra.status}</span>
                      {ra.ai_generated && <span className="text-xs bg-flame-50 text-flame-600 border border-flame-200 rounded-full px-1.5 py-0.5">AI</span>}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5 flex items-center gap-3">
                      {ra.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ra.location}</span>}
                      <span>{format(new Date(ra.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ra.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-500" /> : ra.status === 'completed' ? <Clock className="w-4 h-4 text-blue-500" /> : null}
                    {expandedId === ra.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </div>
              </button>
              {expandedId === ra.id && expandedSteps.length > 0 && (
                <div className="border-t border-gray-100 px-4 pb-4 space-y-2 animate-fade-in">
                  <div className="flex justify-end pt-2 pb-1">
                    <button onClick={() => handlePrint(ra, expandedSteps)} className="btn-secondary text-xs flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Export PDF</button>
                  </div>
                  {expandedSteps.map((step, i) => (
                    <StepRow key={i} step={step} idx={i} expanded={expandedListStep === i} onToggle={() => setExpandedListStep(expandedListStep === i ? null : i)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
