import React from 'react';
import { whatsAppUrl, whatsAppMessages } from '../src/lib/whatsapp';

export interface TournamentForModal {
  id: string;
  name: string;
  slotsTotal?: number;
  slotsTaken?: number;
}

interface UpcomingTournamentModalProps {
  tournament: TournamentForModal | null;
  onClose: () => void;
  onVerInfo: (tournamentId: string) => void;
}

export const UpcomingTournamentModal: React.FC<UpcomingTournamentModalProps> = ({
  tournament,
  onClose,
  onVerInfo,
}) => {
  if (!tournament) return null;

  const handleVerInfo = () => {
    onVerInfo(tournament.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {tournament.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Este torneo se disputará en todas las ligas.
          Solicitá tu cupo para tu categoría.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href={whatsAppUrl(whatsAppMessages.tournamentRegistration(tournament.name))}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center rounded-xl py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold transition-colors shadow-sm"
          >
            Inscribirse / Solicitar cupo
          </a>
            <button
              type="button"
              onClick={handleVerInfo}
              className="w-full flex items-center justify-center rounded-xl py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ver torneo
            </button>
          </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
