import { useEffect, useRef, useState } from 'react';
import {
  Bell, Search, Shield, Sun, Moon,
  Eye, Flag, AlertTriangle, CheckCircle, ChevronRight, X, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../types';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from '../../lib/router';

interface HeaderProps {
  onMenuClick?: () => void;
}

/* ── Notification data model ─────────────────────────────── */
type NotifCategory = 'observation' | 'governance' | 'incident';

interface NotifItem {
  id: string;
  category: NotifCategory;
  title: string;
  subtitle: string;
  href: string;
  time: string;
}

const CATEGORY_STYLE: Record<NotifCategory, {
  icon: React.ReactNode;
  bg: string;
  text: string;
  label: string;
}> = {
  observation: {
    icon: <Eye className="w-4 h-4" />,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Open Observation',
  },
  governance: {
    icon: <Flag className="w-4 h-4" />,
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    label: 'Governance Review',
  },
  incident: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    label: 'Active Incident',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Component ───────────────────────────────────────────── */
export default function Header({ onMenuClick: _onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  /* Fetch notifications on mount and when user changes */
  const fetchNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    const items: NotifItem[] = [];

    try {
      /* Open observations — all roles */
      const { data: obs } = await supabase
        .from('observations')
        .select('id, observation_type, description, severity, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(4);

      obs?.forEach(o => items.push({
        id: `obs-${o.id}`,
        category: 'observation',
        title: (o.description ?? 'Observation').slice(0, 55),
        subtitle: `${o.observation_type ?? 'Safety'} · ${o.severity ?? '—'} severity`,
        href: '/observations',
        time: o.created_at,
      }));

      /* Pending governance reviews — senior roles only */
      if (['admin', 'hse_manager', 'hse_advisor', 'auditor'].includes(user.role)) {
        const { data: gov } = await supabase
          .from('governance_reviews')
          .select('id, review_type, flagged_reason, priority, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3);

        gov?.forEach(g => items.push({
          id: `gov-${g.id}`,
          category: 'governance',
          title: (g.flagged_reason ?? 'AI Response Flagged').slice(0, 55),
          subtitle: `${g.review_type ?? 'Review'} · ${g.priority ?? 'normal'} priority`,
          href: '/governance',
          time: g.created_at,
        }));
      }

      /* Active incidents — operational roles */
      if (!['field_worker', 'contractor'].includes(user.role)) {
        const { data: inc } = await supabase
          .from('incident_reports')
          .select('id, incident_type, description, severity, incident_date')
          .in('status', ['open', 'investigating'])
          .order('incident_date', { ascending: false })
          .limit(3);

        inc?.forEach(i => items.push({
          id: `inc-${i.id}`,
          category: 'incident',
          title: (i.description ?? 'Active Incident').slice(0, 55),
          subtitle: `${i.incident_type ?? 'Incident'} · ${i.severity ?? '—'}`,
          href: '/incident',
          time: i.incident_date ?? new Date().toISOString(),
        }));
      }

      /* Sort newest first, cap at 8 */
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(items.slice(0, 8));
    } catch {
      /* Supabase unreachable — keep empty list */
    }

    setNotifLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user?.id]);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const count = notifications.length;

  return (
    <header className="h-14 bg-white dark:bg-[#182219] border-b border-gray-100 dark:border-[#1f2e24] flex items-center px-4 gap-4 flex-shrink-0 transition-colors duration-200">
      {/* Logo — always visible, clicking returns to home */}
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0"
        title="Go to Home"
      >
        <div className="w-7 h-7 bg-flame-500 rounded-lg flex items-center justify-center shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block">
          <div className="text-navy-900 dark:text-gray-100 font-bold text-sm leading-none">HSE OPS AI</div>
          <div className="text-gray-400 dark:text-gray-600 text-[10px] font-medium mt-0.5 uppercase tracking-wider">NNPC Ltd</div>
        </div>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 w-48 hover:border-flame-300 dark:hover:border-flame-600/40 transition-colors cursor-text">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-gray-400 dark:text-gray-500 text-xs">Search procedures...</span>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* ── Notifications ───────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            title="Notifications"
            className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <Bell className="w-5 h-5" />

            {/* Badge: dot while loading, count once loaded */}
            {notifLoading && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-flame-500 rounded-full ring-2 ring-white dark:ring-[#182219]" />
            )}
            {!notifLoading && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-flame-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 ring-2 ring-white dark:ring-[#182219]">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {/* ── Dropdown panel ─────────────────────────── */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white dark:bg-[#182219] rounded-xl border border-gray-100 dark:border-[#1f2e24] shadow-panel z-50 overflow-hidden animate-fade-in">
              {/* Header row */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1f2e24] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-navy-900 dark:text-gray-100 text-sm font-semibold">Notifications</span>
                  {!notifLoading && count > 0 && (
                    <span className="bg-flame-500/10 text-flame-600 dark:text-flame-400 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { fetchNotifications(); }}
                    title="Refresh"
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              {notifLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-4/5" />
                        <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : count === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle className="w-9 h-9 text-flame-500/30 mx-auto mb-3" />
                  <p className="text-navy-900 dark:text-gray-100 text-sm font-medium">All clear</p>
                  <p className="text-gray-400 text-xs mt-1">No pending items requiring attention</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-[#1f2e24] max-h-72 overflow-y-auto">
                  {notifications.map(notif => {
                    const style = CATEGORY_STYLE[notif.category];
                    return (
                      <Link
                        key={notif.id}
                        to={notif.href}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.text} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-navy-900 dark:text-gray-100 text-xs font-medium leading-snug line-clamp-2">
                            {notif.title}
                          </p>
                          <p className="text-gray-400 text-[11px] mt-0.5">{notif.subtitle}</p>
                          <p className="text-gray-300 dark:text-gray-600 text-[10px] mt-0.5">{timeAgo(notif.time)}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-50 dark:border-[#1f2e24] flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {notifLoading ? 'Loading…' : `${count} item${count !== 1 ? 's' : ''} need attention`}
                </span>
                <Link
                  to="/observations"
                  onClick={() => setNotifOpen(false)}
                  className="text-flame-600 dark:text-flame-400 text-xs flex items-center gap-1 hover:underline font-medium"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        {user && (
          <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-white/10 ml-1">
            <div className="w-8 h-8 rounded-lg bg-flame-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-flame-500/20">
              <span className="text-flame-600 dark:text-flame-400 text-xs font-bold">
                {user.full_name?.charAt(0)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-navy-900 dark:text-gray-100 text-xs font-semibold">{user.full_name}</div>
              <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
