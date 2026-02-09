import type { ReactNode } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

interface GameShellProps {
  title: string;
  children: ReactNode;
}

export default function GameShell({ title, children }: GameShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="max-w-5xl w-full mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center px-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
