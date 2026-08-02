import { useLocation, Link } from '../../lib/router';
import { useAuthStore } from '../../stores/authStore';
import { NAV_SECTIONS } from './navConfig';
import type { NavItem } from './navConfig';

export default function HorizontalNav() {
  const location = useLocation();
  const { user } = useAuthStore();

  const isAllowed = (item: NavItem) => {
    if (!item.roles) return true;
    return user ? item.roles.includes(user.role) : false;
  };

  const allItems = NAV_SECTIONS.flatMap(s => s.items).filter(isAllowed);

  return (
    <nav className="bg-white dark:bg-[#182219] border-b border-gray-100 dark:border-[#1f2e24] flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-0.5 px-3 overflow-x-auto scrollbar-hide">
        {allItems.map(item => {
          const active =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-1.5 px-3 py-3 text-xs font-medium
                border-b-2 whitespace-nowrap flex-shrink-0
                transition-all duration-150
                ${active
                  ? `border-flame-500 ${item.color.icon} dark:${item.color.icon}`
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-navy-900 dark:hover:text-gray-200 hover:border-gray-200 dark:hover:border-gray-600'
                }
              `}
            >
              <span className={`flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${active ? item.color.icon : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
