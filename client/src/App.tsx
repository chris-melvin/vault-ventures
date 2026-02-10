import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WheelPage from './pages/WheelPage';
import SlotsPage from './pages/SlotsPage';
import BlackjackPage from './pages/BlackjackPage';
import BaccaratPage from './pages/BaccaratPage';
import UTHPage from './pages/UTHPage';
import BankPage from './pages/BankPage';
import AchievementsPage from './pages/AchievementsPage';
import MarketPage from './pages/MarketPage';
import PinballPage from './pages/PinballPage';
import AchievementToast from './components/achievements/AchievementToast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AchievementToast />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/wheel" element={<ProtectedRoute><WheelPage /></ProtectedRoute>} />
        <Route path="/slots" element={<ProtectedRoute><SlotsPage /></ProtectedRoute>} />
        <Route path="/blackjack" element={<ProtectedRoute><BlackjackPage /></ProtectedRoute>} />
        <Route path="/baccarat" element={<ProtectedRoute><BaccaratPage /></ProtectedRoute>} />
        <Route path="/uth" element={<ProtectedRoute><UTHPage /></ProtectedRoute>} />
        <Route path="/pinball" element={<ProtectedRoute><PinballPage /></ProtectedRoute>} />
        <Route path="/bank" element={<ProtectedRoute><BankPage /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
        <Route path="/market" element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
