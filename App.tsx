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
import AdminLoginScreen from '@/pages/admin/AdminLoginScreen';
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

const MainApp: React.FC = () => {
  const [currentScreen, setScreenState] = useState('home');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
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

    if (!window.history.state || (window.history.state as HistoryState).screen === undefined) {
      window.history.replaceState(state, '', window.location.pathname + window.location.search);
    } else {
      window.history.pushState(state, '', window.location.pathname + window.location.search);
    }
  }, [currentScreen, selectedTournamentId, selectedPlayerId]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as HistoryState | null;
      if (!state?.screen) return;
      isRestoringFromPopState.current = true;
      setScreenState(state.screen);
      setSelectedTournamentId(state.tournamentId ?? null);
      setSelectedPlayerId(state.playerId ?? null);
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
          <Suspense fallback={<div className="flex flex-1 items-center justify-center py-24 text-sm font-medium uppercase tracking-wide text-[#616f89] dark:text-gray-400">Cargando torneo...</div>}>
            <TournamentDetailScreen tournamentId={selectedTournamentId} setScreen={setScreen} />
          </Suspense>
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
      <Route path="torneos/:tournamentId" element={<AdminTournamentWorkspace />} />
    </Route>
    <Route path="*" element={<MainApp />} />
  </Routes>
);

export default App;
