import { useLocation, Outlet } from '../../lib/router';
import Header from './Header';
import HorizontalNav from './HorizontalNav';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/home';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-[#0f1712] transition-colors duration-200">
      <Header />
      {!isHome && <HorizontalNav />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
