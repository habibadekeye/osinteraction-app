import { Link, useLocation } from '../../lib/router';
import {
  Shield, MessageSquare, BookOpen, AlertTriangle, ClipboardList,
  HardHat, Eye, BarChart3, Settings, LogOut, ChevronLeft,
  ChevronRight, FileCheck, Search, GraduationCap, AlertOctagon, Users, Flag
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
      { path: '/chat', label: 'AI Assistant', icon: <MessageSquare className="w-4 h-4" />, roles: ['admin','hse_manager','hse_advisor','supervisor','field_worker','contractor'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" /> },
      { path: '/emergency', label: 'Emergency', icon: <AlertOctagon className="w-4 h-4" /> },
      { path: '/ptw', label: 'PTW Guidance', icon: <FileCheck className="w-4 h-4" /> },
      { path: '/risk-assessment', label: 'Risk Assessment', icon: <ClipboardList className="w-4 h-4" />, roles: ['admin','hse_manager','hse_advisor','supervisor','auditor'] },
      { path: '/toolbox', label: 'Toolbox Talks', icon: <HardHat className="w-4 h-4" /> },
      { path: '/observations', label: 'Observations', icon: <Eye className="w-4 h-4" /> },
      { path: '/incident', label: 'Incident Guidance', icon: <Search className="w-4 h-4" />, roles: ['admin','hse_manager','hse_advisor','supervisor','auditor'] },
    ],
  },
  {
    title: 'Learning',
    items: [
      { path: '/learning', label: 'Learning & Competency', icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { path: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, roles: ['admin','hse_manager','auditor'] },
      { path: '/governance', label: 'Governance', icon: <Flag className="w-4 h-4" />, roles: ['admin','hse_manager','hse_advisor','auditor'] },
      { path: '/admin', label: 'Administration', icon: <Settings className="w-4 h-4" />, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isAllowed = (item: NavItem) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  };

  return (
    <aside className={`flex flex-col h-full bg-navy-900 border-r border-white/5 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-white/5 flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-4 gap-3'}`}>
        <div className="w-8 h-8 bg-flame-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base leading-none">HSE OPS AI</div>
            <div className="text-navy-400 text-[10px] mt-0.5 font-medium uppercase tracking-wider">NNPC Ltd · HSE Platform</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items.filter(isAllowed);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              {!collapsed && (
                <div className="text-navy-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">{section.title}</div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`nav-item ${active ? 'nav-item-active' : 'nav-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/5 flex-shrink-0">
        {!collapsed && user && (
          <div className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-flame-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-flame-500/30">
              <Users className="w-4 h-4 text-flame-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.full_name}</div>
              <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <button onClick={logout} className="text-navy-400 hover:text-red-400 transition-colors p-1 rounded" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        {collapsed && (
          <div className="p-2 flex flex-col items-center gap-2">
            <button onClick={logout} title="Sign out" className="text-navy-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 text-navy-500 hover:text-navy-300 hover:bg-white/5 transition-all border-t border-white/5"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
