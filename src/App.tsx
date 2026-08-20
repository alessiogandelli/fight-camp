import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/AppStore';
import { I18nProvider } from './lib/i18n';
import { ToastProvider } from './components/Toast';
import Shell from './components/Shell';
import TrainPage from './pages/TrainPage';
import WorkoutsPage from './pages/WorkoutsPage';
import WorkoutBuilderPage from './pages/WorkoutBuilderPage';
import CombinationsPage from './pages/CombinationsPage';
import ComboBuilderPage from './pages/ComboBuilderPage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import LivePage from './pages/LivePage';
import CompletePage from './pages/CompletePage';

export default function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/live" element={<LivePage />} />
              <Route path="/complete" element={<CompletePage />} />
              <Route element={<Shell />}>
                <Route path="/" element={<TrainPage />} />
                <Route path="/workouts" element={<WorkoutsPage />} />
                <Route path="/workouts/new" element={<WorkoutBuilderPage />} />
                <Route path="/workouts/:id" element={<WorkoutBuilderPage />} />
                <Route path="/combos" element={<CombinationsPage />} />
                <Route path="/combos/new" element={<ComboBuilderPage />} />
                <Route path="/combos/:id" element={<ComboBuilderPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/stats" element={<StatsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </StoreProvider>
    </I18nProvider>
  );
}
