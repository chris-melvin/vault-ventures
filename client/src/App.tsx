import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WheelPage from './pages/WheelPage';
import SlotsPage from './pages/SlotsPage';
import BlackjackPage from './pages/BlackjackPage';
import BaccaratPage from './pages/BaccaratPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/wheel" element={<ProtectedRoute><WheelPage /></ProtectedRoute>} />
        <Route path="/slots" element={<ProtectedRoute><SlotsPage /></ProtectedRoute>} />
        <Route path="/blackjack" element={<ProtectedRoute><BlackjackPage /></ProtectedRoute>} />
        <Route path="/baccarat" element={<ProtectedRoute><BaccaratPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
