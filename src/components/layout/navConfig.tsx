import {
  BarChart3, MessageSquare, BookOpen, AlertOctagon, FileCheck,
  ClipboardList, HardHat, Eye, Search, GraduationCap,
  Flag, Settings,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  roles?: string[];
  color: {
    card: string;   // card icon bg
    icon: string;   // icon text colour
    glow: string;   // subtle border/glow on hover
  };
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        description: 'Activity overview, KPIs and live safety metrics',
        icon: <BarChart3 className="w-6 h-6" />,
        color: { card: 'bg-flame-500/10 dark:bg-flame-500/15', icon: 'text-flame-600 dark:text-flame-400', glow: 'hover:border-flame-400/40' },
      },
      {
        path: '/chat',
        label: 'AI Assistant',
        description: 'Ask HSE questions and get procedure guidance instantly',
        icon: <MessageSquare className="w-6 h-6" />,
        roles: ['admin','hse_manager','hse_advisor','supervisor','field_worker','contractor'],
        color: { card: 'bg-violet-500/10 dark:bg-violet-500/15', icon: 'text-violet-600 dark:text-violet-400', glow: 'hover:border-violet-400/40' },
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        path: '/knowledge',
        label: 'Knowledge Base',
        description: 'Browse, search and manage approved HSE procedures',
        icon: <BookOpen className="w-6 h-6" />,
        color: { card: 'bg-emerald-500/10 dark:bg-emerald-500/15', icon: 'text-emerald-600 dark:text-emerald-400', glow: 'hover:border-emerald-400/40' },
      },
      {
        path: '/emergency',
        label: 'Emergency',
        description: 'Emergency response cards and escalation contacts',
        icon: <AlertOctagon className="w-6 h-6" />,
        color: { card: 'bg-red-500/10 dark:bg-red-500/15', icon: 'text-red-600 dark:text-red-400', glow: 'hover:border-red-400/40' },
      },
      {
        path: '/ptw',
        label: 'PTW Guidance',
        description: 'Permit to Work requirements and pre-job checklists',
        icon: <FileCheck className="w-6 h-6" />,
        color: { card: 'bg-amber-500/10 dark:bg-amber-500/15', icon: 'text-amber-600 dark:text-amber-400', glow: 'hover:border-amber-400/40' },
      },
      {
        path: '/risk-assessment',
        label: 'Risk Assessment',
        description: 'HIRA creation, hazard identification and control measures',
        icon: <ClipboardList className="w-6 h-6" />,
        roles: ['admin','hse_manager','hse_advisor','supervisor','auditor'],
        color: { card: 'bg-orange-500/10 dark:bg-orange-500/15', icon: 'text-orange-600 dark:text-orange-400', glow: 'hover:border-orange-400/40' },
      },
      {
        path: '/toolbox',
        label: 'Toolbox Talks',
        description: 'Pre-task safety briefings, sign-offs and topic library',
        icon: <HardHat className="w-6 h-6" />,
        color: { card: 'bg-teal-500/10 dark:bg-teal-500/15', icon: 'text-teal-600 dark:text-teal-400', glow: 'hover:border-teal-400/40' },
      },
      {
        path: '/observations',
        label: 'Observations',
        description: 'Log unsafe acts, conditions and near-miss events',
        icon: <Eye className="w-6 h-6" />,
        color: { card: 'bg-blue-500/10 dark:bg-blue-500/15', icon: 'text-blue-600 dark:text-blue-400', glow: 'hover:border-blue-400/40' },
      },
      {
        path: '/incident',
        label: 'Incident Guidance',
        description: 'Incident reporting workflow and investigation steps',
        icon: <Search className="w-6 h-6" />,
        roles: ['admin','hse_manager','hse_advisor','supervisor','auditor'],
        color: { card: 'bg-rose-500/10 dark:bg-rose-500/15', icon: 'text-rose-600 dark:text-rose-400', glow: 'hover:border-rose-400/40' },
      },
    ],
  },
  {
    title: 'Learning',
    items: [
      {
        path: '/learning',
        label: 'Learning & Competency',
        description: 'Training records, certificates and competency tracking',
        icon: <GraduationCap className="w-6 h-6" />,
        color: { card: 'bg-sky-500/10 dark:bg-sky-500/15', icon: 'text-sky-600 dark:text-sky-400', glow: 'hover:border-sky-400/40' },
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        path: '/analytics',
        label: 'Analytics',
        description: 'Safety performance trends, dashboards and exports',
        icon: <BarChart3 className="w-6 h-6" />,
        roles: ['admin','hse_manager','auditor'],
        color: { card: 'bg-purple-500/10 dark:bg-purple-500/15', icon: 'text-purple-600 dark:text-purple-400', glow: 'hover:border-purple-400/40' },
      },
      {
        path: '/governance',
        label: 'Governance',
        description: 'AI response audit, flagging and governance reviews',
        icon: <Flag className="w-6 h-6" />,
        roles: ['admin','hse_manager','hse_advisor','auditor'],
        color: { card: 'bg-indigo-500/10 dark:bg-indigo-500/15', icon: 'text-indigo-600 dark:text-indigo-400', glow: 'hover:border-indigo-400/40' },
      },
      {
        path: '/admin',
        label: 'Administration',
        description: 'User accounts, roles and system configuration',
        icon: <Settings className="w-6 h-6" />,
        roles: ['admin'],
        color: { card: 'bg-slate-500/10 dark:bg-slate-500/15', icon: 'text-slate-600 dark:text-slate-400', glow: 'hover:border-slate-400/40' },
      },
    ],
  },
];
