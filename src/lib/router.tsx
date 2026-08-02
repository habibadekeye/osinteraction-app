import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ── Location ──────────────────────────────────────────────────────────────────

export interface Location {
  pathname: string;
  search: string;
  hash: string;
}

function getLocation(): Location {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

// ── Router context ────────────────────────────────────────────────────────────

interface RouterCtx {
  location: Location;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterCtx | null>(null);

function useRouter(): RouterCtx {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('No router context');
  return ctx;
}

export function useLocation(): Location {
  return useRouter().location;
}

export function useNavigate() {
  return useRouter().navigate;
}

// ── BrowserRouter ─────────────────────────────────────────────────────────────

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(getLocation);

  useEffect(() => {
    const onPop = () => setLocation(getLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    setLocation(getLocation());
  }, []);

  return (
    <RouterContext.Provider value={{ location, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

// ── Route matching ────────────────────────────────────────────────────────────

function matchPath(pattern: string, pathname: string): boolean {
  if (pattern === '*') return true;
  if (pattern === pathname) return true;
  // Trailing wildcard: "/foo/*"
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(base + '/');
  }
  return false;
}

// ── Routes / Route context ────────────────────────────────────────────────────

interface RouteMatch {
  element: ReactNode;
}

const RouteContext = createContext<{ outlet: ReactNode }>({ outlet: null });

export function useOutlet() {
  return useContext(RouteContext).outlet;
}

interface RouteProps {
  path?: string;
  element?: ReactNode;
  children?: ReactNode;
}

// Route is a data-only component; rendering is handled by Routes.
export function Route(_props: RouteProps): null {
  return null;
}

function buildRouteTree(children: ReactNode): RouteProps[] {
  const routes: RouteProps[] = [];
  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type === Route) {
      routes.push(child.props as RouteProps);
    }
  });
  return routes;
}

export function Routes({ children }: { children: ReactNode }) {
  const { location } = useRouter();
  const routes = buildRouteTree(children);
  return <>{renderRoutes(routes, location.pathname)}</>;
}

function renderRoutes(routes: RouteProps[], pathname: string): ReactNode {
  for (const route of routes) {
    // Layout route (no path, has children)
    if (!route.path && route.children) {
      const childRoutes = buildRouteTree(route.children);
      const childMatch = renderRoutes(childRoutes, pathname);
      if (childMatch !== null) {
        const outlet = childMatch;
        return (
          <RouteContext.Provider value={{ outlet }}>
            {route.element}
          </RouteContext.Provider>
        );
      }
      continue;
    }

    const pattern = route.path ?? '';
    if (matchPath(pattern, pathname)) {
      if (route.children) {
        const childRoutes = buildRouteTree(route.children);
        const childMatch = renderRoutes(childRoutes, pathname);
        const outlet = childMatch;
        return (
          <RouteContext.Provider value={{ outlet }}>
            {route.element}
          </RouteContext.Provider>
        );
      }
      return <>{route.element}</>;
    }
  }
  return null;
}

// ── Outlet ────────────────────────────────────────────────────────────────────

export function Outlet() {
  return <>{useOutlet()}</>;
}

// ── Navigate ──────────────────────────────────────────────────────────────────

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to, { replace });
  }, []);
  return null;
}

// ── Link ──────────────────────────────────────────────────────────────────────

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.(e);
    navigate(to, { replace });
  };
  return <a href={to} onClick={handleClick} {...rest}>{children}</a>;
}
