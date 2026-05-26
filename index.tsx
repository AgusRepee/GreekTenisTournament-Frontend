import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initializeTournamentDataFromSeedIfEmpty } from '@/services/dataService';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { ensurePublicRankingsLoaded } from '@/data/services/api/publicRankingsStore';
import App from './App';

initializeTournamentDataFromSeedIfEmpty();
if (getDataSourceMode() === 'api') {
  ensurePublicRankingsLoaded();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);