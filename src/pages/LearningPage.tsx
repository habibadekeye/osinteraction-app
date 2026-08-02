import { useState, useEffect } from 'react';
import { BookOpen, Play, CheckCircle, Clock, Award, ChevronRight, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from '../lib/date-fns';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  module_type: string;
  duration_minutes: number;
  is_mandatory: boolean;
  category: string;
  created_at: string;
}

const MODULE_COLORS: Record<string, string> = {
  video: 'bg-purple-100 text-purple-700',
  quiz: 'bg-blue-100 text-blue-700',
  document: 'bg-green-100 text-green-700',
  simulation: 'bg-orange-100 text-orange-700',
};

export default function LearningPage() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('learning_modules').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setModules(data); setLoading(false); });
  }, []);

  const featured = [
    { title: 'H₂S Safety Awareness', desc: 'Properties, detection, PPE and emergency response for hydrogen sulfide exposure on oil and gas platforms.', duration: 45, mandatory: true, icon: '⚠️', color: 'bg-yellow-600' },
    { title: 'Confined Space Entry', desc: 'Step-by-step procedures for safe confined space entry including atmospheric testing, isolation, and rescue.', duration: 60, mandatory: true, icon: '🔒', color: 'bg-navy-700' },
    { title: 'PTW System Overview', desc: 'Understanding the Permit to Work process, types of permits, and responsibilities for permit holders.', duration: 30, mandatory: false, icon: '📋', color: 'bg-blue-600' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Learning & Competency</h1>
        <p className="text-gray-500 text-sm mt-0.5">HSE training modules, certifications, and learning resources</p>
      </div>

      {/* Featured modules */}
      <div>
        <h2 className="text-navy-900 font-semibold text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-flame-500" /> Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featured.map(mod => (
            <div key={mod.title} className="card p-4 hover:border-flame-200 hover:shadow-panel transition-all group cursor-pointer">
              <div className={`w-10 h-10 ${mod.color} rounded-xl flex items-center justify-center text-xl mb-3`}>{mod.icon}</div>
              <div className="flex items-center gap-1.5 mb-2">
                {mod.mandatory && <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-1.5 py-0.5">Mandatory</span>}
                <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{mod.duration} min</span>
              </div>
              <h3 className="text-navy-900 font-semibold text-sm mb-1 group-hover:text-flame-600 transition-colors">{mod.title}</h3>
              <p className="text-gray-500 text-xs line-clamp-3">{mod.desc}</p>
              <button className="mt-3 flex items-center gap-1 text-flame-600 text-xs font-medium hover:gap-2 transition-all">
                <Play className="w-3 h-3" /> Start Module
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All modules from DB */}
      <div>
        <h2 className="text-navy-900 font-semibold text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-flame-500" /> All Modules</h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-gray-50" />)}</div>
        ) : modules.length === 0 ? (
          <div className="card p-10 text-center">
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No modules available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map(m => (
              <div key={m.id} className="card p-4 hover:border-flame-200 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-navy-900 font-semibold text-sm group-hover:text-flame-600 transition-colors">{m.title}</h3>
                      {m.is_mandatory && <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-1.5 py-0.5">Mandatory</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${MODULE_COLORS[m.module_type] || 'bg-gray-100 text-gray-600'}`}>{m.module_type}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.duration_minutes} min</span>
                      {m.category && <span>{m.category}</span>}
                      <span>{format(new Date(m.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-flame-500 flex-shrink-0 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress summary */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-flame-500" />
          <h3 className="text-navy-900 font-semibold text-sm">Your Learning Progress</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[{ label: 'Completed', value: '0', color: 'text-green-600' }, { label: 'In Progress', value: '0', color: 'text-yellow-600' }, { label: 'Not Started', value: String(modules.length + 3), color: 'text-gray-500' }].map(s => (
            <div key={s.label}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
