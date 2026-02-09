import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useGameStore } from '../stores/useGameStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const setBalance = useGameStore((s) => s.setBalance);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = isRegister ? auth.register : auth.login;
      const res = await fn(username, pin);
      login(res.token, res.user.id, res.user.username);
      setBalance(res.user.balance_cents);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-casino-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-casino-gold tracking-[0.2em] mb-2">
            SOLAIRE
          </h1>
          <div className="w-24 h-0.5 bg-casino-gold/30 mx-auto mb-3" />
          <p className="text-white/40 text-sm tracking-wider uppercase">Premium Gaming Suite</p>
        </div>

        <div className="card-panel p-8">
          <div className="flex mb-6 border-b border-white/10">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                !isRegister ? 'text-casino-gold border-b-2 border-casino-gold' : 'text-white/40'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                isRegister ? 'text-casino-gold border-b-2 border-casino-gold' : 'text-white/40'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter username"
                minLength={3}
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input-field text-center tracking-[0.5em] text-2xl"
                placeholder="****"
                maxLength={4}
                inputMode="numeric"
                required
              />
            </div>

            {error && (
              <div className="text-casino-red text-sm text-center bg-casino-red/10 rounded-lg py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || pin.length !== 4} className="btn-primary w-full">
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {isRegister && (
            <p className="text-white/30 text-xs text-center mt-4">
              New accounts start with $1,000.00
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
