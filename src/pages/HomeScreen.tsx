import { useNavigate } from '../lib/router';
import { Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { NAV_SECTIONS } from '../components/layout/navConfig';
import type { NavItem } from '../components/layout/navConfig';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isAllowed = (item: NavItem) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  };

  const visibleSections = NAV_SECTIONS
    .map(s => ({ ...s, items: s.items.filter(isAllowed) }))
    .filter(s => s.items.length > 0);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-[#0f1712] px-4 sm:px-8 py-8 transition-colors duration-200">
      {/* Welcome banner */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Select a module to get started
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-sm font-semibold text-navy-900 dark:text-gray-100">{user?.full_name}</div>
            <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${user ? ROLE_COLORS[user.role] : ''}`}>
              {user ? ROLE_LABELS[user.role] : ''}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section groups */}
      <div className="space-y-8">
        {visibleSections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3 px-1">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {section.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    group relative flex flex-col items-start gap-3 p-4 rounded-xl
                    bg-white dark:bg-[#182219]
                    border border-gray-100 dark:border-[#1f2e24]
                    ${item.color.glow}
                    hover:shadow-md dark:hover:shadow-black/30
                    hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-sm
                    transition-all duration-200 text-left
                  `}
                >
                  {/* Icon bubble */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color.card} ${item.color.icon} transition-transform duration-200 group-hover:scale-110`}>
                    {item.icon}
                  </div>

                  {/* Label + description */}
                  <div>
                    <div className="text-sm font-semibold text-navy-900 dark:text-gray-100 leading-tight">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-snug line-clamp-2">
                      {item.description}
                    </div>
                  </div>

                  {/* Subtle arrow */}
                  <svg
                    className="absolute top-3.5 right-3.5 w-3.5 h-3.5 text-gray-200 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer branding */}
      <div className="mt-12 flex items-center gap-2 text-gray-300 dark:text-gray-700">
        <div className="w-5 h-5 bg-flame-500/20 rounded flex items-center justify-center">
          <Shield className="w-3 h-3 text-flame-500" />
        </div>
        <span className="text-xs">HSE OPS AI · NNPC Ltd · HSE Intelligence Platform</span>
      </div>
    </div>
  );
}
