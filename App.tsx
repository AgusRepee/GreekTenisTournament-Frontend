import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { HomeScreen } from './screens/HomeScreen';
import { DirectoryScreen } from './screens/DirectoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RankingsScreen } from './screens/RankingsScreen';
import { PlayerSearchScreen } from './screens/PlayerSearchScreen';
import { ContactScreen } from './screens/ContactScreen';
import { NewsScreen } from './screens/NewsScreen';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminForgotPasswordScreen from '@/pages/admin/AdminForgotPasswordScreen';
import AdminLoginScreen from '@/pages/admin/AdminLoginScreen';
import AdminResetPasswordScreen from '@/pages/admin/AdminResetPasswordScreen';
import ProtectedAdminRoute from '@/pages/admin/ProtectedAdminRoute';
import AdminTournamentWorkspace from '@/pages/admin/AdminTournamentWorkspace';
import {
  AdminConfiguracionPage,
  AdminDashboardPage,
  AdminJugadoresPage,
  AdminNoticiasPage,
  AdminTournamentListPage,
} from '@/pages/admin/adminSectionPages';
import { ENABLE_ADVANCED_ADMIN_CREATION } from '@/config/adminFeatures';
import { AdminTournamentBuilderCreateRedirect } from '@/pages/admin/tournamentBuilder/AdminTournamentBuilderCreateRedirect';
import AdminTournamentBuilderPage from '@/pages/admin/tournamentBuilder/AdminTournamentBuilderPage';

const TournamentDetailScreen = lazy(() => import('./screens/TournamentDetailScreen').then((m) => ({ default: m.TournamentDetailScreen })));

type HistoryState = { screen: string; tournamentId?: string | null; playerId?: string | null };

function normalizePublicPath(pathname: string): string {
  const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
  const withoutBase = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return withoutBase.replace(/\/+$/, '') || '/';
}

function parsePublicPath(pathname: string): HistoryState {
  const path = normalizePublicPath(pathname);
  if (path === '/novedades') return { screen: 'news' };
  if (path === '/rankings') return { screen: 'rankings' };
  if (path === '/jugadores') return { screen: 'players' };
  if (path.startsWith('/jugadores/')) {
    const playerId = decodeURIComponent(path.slice('/jugadores/'.length));
    return playerId ? { screen: 'profile', playerId } : { screen: 'players' };
  }
  if (path === '/contacto') return { screen: 'contact' };
  if (path === '/torneos') return { screen: 'directory' };
  if (path.startsWith('/torneos/')) {
    const tournamentId = decodeURIComponent(path.slice('/torneos/'.length));
    return tournamentId ? { screen: 'tournament_detail', tournamentId } : { screen: 'directory' };
  }
  return { screen: 'home' };
}

function pathForState(state: HistoryState): string {
  switch (state.screen) {
    case 'news':
      return '/novedades';
    case 'rankings':
      return '/rankings';
    case 'players':
      return '/jugadores';
    case 'profile':
      return state.playerId ? `/jugadores/${encodeURIComponent(state.playerId)}` : '/jugadores';
    case 'contact':
      return '/contacto';
    case 'directory':
      return '/torneos';
    case 'tournament_detail':
      return state.tournamentId ? `/torneos/${encodeURIComponent(state.tournamentId)}` : '/torneos';
    default:
      return '/';
  }
}

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; label: string },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`${this.props.label} crashed`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sport-card dark:border-red-900/60 dark:bg-card-dark">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-300">Error al cargar</p>
          <h1 className="mt-3 text-2xl font-black text-[#111318] dark:text-white">No pudimos mostrar esta sección</h1>
          <p className="mt-3 text-sm text-[#616f89] dark:text-gray-300">
            Hay un dato inconsistente en el torneo. El resto del sitio sigue disponible mientras lo revisamos.
          </p>
        </div>
      </div>
    );
  }
}

const MainApp: React.FC = () => {
  const initialRoute = parsePublicPath(window.location.pathname);
  const [currentScreen, setScreenState] = useState(initialRoute.screen);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialRoute.playerId ?? null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialRoute.tournamentId ?? null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const isRestoringFromPopState = useRef(false);

  const profileNavGateRef = useRef<{
    tryNavigate: (targetScreen: string, proceed: () => void) => void;
  }>({
    tryNavigate: (_targetScreen, proceed) => proceed(),
  });

  const setScreen = useCallback(
    (screen: string) => {
      if (screen === currentScreen) return;
      if (currentScreen === 'profile') {
        profileNavGateRef.current.tryNavigate(screen, () => setScreenState(screen));
        return;
      }
      setScreenState(screen);
    },
    [currentScreen],
  );

  /** Un solo tick: evita perfil sin `selectedPlayerId` si el batch fallara en algún entorno. */
  const openPlayerProfile = useCallback(
    (playerId: string) => {
      if (currentScreen === 'profile' && selectedPlayerId !== playerId) {
        profileNavGateRef.current.tryNavigate('profile', () => {
          setSelectedPlayerId(playerId);
        });
        return;
      }
      setSelectedPlayerId(playerId);
      setScreenState('profile');
    },
    [currentScreen, selectedPlayerId],
  );

  useEffect(() => {
    const state: HistoryState = {
      screen: currentScreen,
      tournamentId: selectedTournamentId,
      playerId: selectedPlayerId,
    };

    if (isRestoringFromPopState.current) {
      isRestoringFromPopState.current = false;
      return;
    }

    const nextPath = pathForState(state);
    if (!window.history.state || (window.history.state as HistoryState).screen === undefined) {
      window.history.replaceState(state, '', nextPath);
    } else {
      window.history.pushState(state, '', nextPath);
    }
  }, [currentScreen, selectedTournamentId, selectedPlayerId]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as HistoryState | null;
      const nextState = state?.screen ? state : parsePublicPath(window.location.pathname);
      isRestoringFromPopState.current = true;
      setScreenState(nextState.screen);
      setSelectedTournamentId(nextState.tournamentId ?? null);
      setSelectedPlayerId(nextState.playerId ?? null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home': return <HomeScreen setScreen={setScreen} setSelectedTournamentId={setSelectedTournamentId} />;
      case 'directory': return <DirectoryScreen setScreen={setScreen} setSelectedTournamentId={setSelectedTournamentId} />;
      case 'profile': return (
        <ProfileScreen
          selectedPlayerId={selectedPlayerId}
          setSelectedPlayerId={setSelectedPlayerId}
          setScreen={setScreen}
          profileNavGateRef={profileNavGateRef}
        />
      );
      case 'rankings': return (
        <RankingsScreen setScreen={setScreen} setSelectedPlayerId={setSelectedPlayerId} openPlayerProfile={openPlayerProfile} />
      );
      case 'players': return (
        <PlayerSearchScreen
          setScreen={setScreen}
          setSelectedPlayerId={setSelectedPlayerId}
          initialQuery={playerSearchQuery}
          openPlayerProfile={openPlayerProfile}
        />
      );
      case 'contact': return <ContactScreen />;
      case 'news': return <NewsScreen />;
      case 'tournament_detail':
        return (
          <RouteErrorBoundary key={selectedTournamentId ?? 'tournament'} label="TournamentDetailScreen">
            <Suspense fallback={<div className="flex flex-1 items-center justify-center py-24 text-sm font-medium uppercase tracking-wide text-[#616f89] dark:text-gray-400">Cargando torneo...</div>}>
              <TournamentDetailScreen tournamentId={selectedTournamentId} setScreen={setScreen} />
            </Suspense>
          </RouteErrorBoundary>
        );
      default: return <HomeScreen setScreen={setScreen} setSelectedTournamentId={setSelectedTournamentId} />;
    }
  };

  return (
    <div className="app-page-canvas min-h-screen flex flex-col">
      <div className="app-page-content flex min-h-0 flex-1 flex-col pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-[calc(4.5rem+env(safe-area-inset-top,0px))]">
        <Navbar
          currentScreen={currentScreen}
          setScreen={setScreen}
          onPlayerSearch={(q) => {
            setPlayerSearchQuery(q);
            setSelectedPlayerId(null);
          }}
        />
        <div className="flex min-h-0 flex-1 flex-col">{renderScreen()}</div>
        <Footer setScreen={setScreen} />
        <CookieBanner />
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <Routes>
    <Route path="/login" element={<AdminLoginScreen />} />
    <Route path="/forgot-password" element={<AdminForgotPasswordScreen />} />
    <Route path="/reset-password" element={<AdminResetPasswordScreen />} />
    <Route
      path="/admin"
      element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="jugadores" element={<AdminJugadoresPage />} />
      <Route path="noticias" element={<AdminNoticiasPage />} />
      <Route path="configuracion" element={<AdminConfiguracionPage />} />
      <Route path="torneos" element={<AdminTournamentListPage />} />
      <Route
        path="torneos/nuevo"
        element={
          ENABLE_ADVANCED_ADMIN_CREATION ? (
            <AdminTournamentBuilderCreateRedirect />
          ) : (
            <Navigate to="/admin/torneos" replace />
          )
        }
      />
      <Route
        path="torneos/constructor/:projectId"
        element={
          ENABLE_ADVANCED_ADMIN_CREATION ? <AdminTournamentBuilderPage /> : <Navigate to="/admin/torneos" replace />
        }
      />
      <Route
        path="torneos/:tournamentId"
        element={
          <RouteErrorBoundary label="AdminTournamentWorkspace">
            <AdminTournamentWorkspace />
          </RouteErrorBoundary>
        }
      />
    </Route>
    <Route path="*" element={<MainApp />} />
  </Routes>
);

export default App;
