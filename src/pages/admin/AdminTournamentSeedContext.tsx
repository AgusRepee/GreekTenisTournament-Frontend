import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Player } from '@/lib/mockData';
import { buildAdminSeedFormatters, type AdminSeedFormatters } from '@/lib/admin/adminTournamentSeedDisplay';

const AdminTournamentSeedContext = createContext<AdminSeedFormatters | null>(null);

export function AdminTournamentSeedProvider({
  seedMap,
  players,
  children,
}: {
  seedMap: Map<string, number>;
  players: readonly Player[];
  children: ReactNode;
}) {
  const value = useMemo(() => buildAdminSeedFormatters(seedMap, players), [seedMap, players]);
  return <AdminTournamentSeedContext.Provider value={value}>{children}</AdminTournamentSeedContext.Provider>;
}

export function useOptionalAdminTournamentSeed(): AdminSeedFormatters | null {
  return useContext(AdminTournamentSeedContext);
}
