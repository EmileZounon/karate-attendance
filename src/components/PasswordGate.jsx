import { useState, useEffect, useCallback } from 'react';

const TEAM_PASSWORD = 'Karatediplomacy@2026';

const ERROR_MESSAGES = [
  'Keikoku. Try again.',
  'Hansoku-Chui. Do 2 Sochin and Try again.',
  'Hansoku. You are not among the descendants of Funakoshi and Tabata.',
];

const LOCKOUT_DURATIONS = [5 * 60000, 15 * 60000, 24 * 3600000]; // 5min, 15min, 24h

function getLockoutDuration(attempts) {
  if (attempts < 3) return 0;
  const index = Math.min(attempts - 3, LOCKOUT_DURATIONS.length - 1);
  return LOCKOUT_DURATIONS[index];
}

function readLockoutState() {
  const attempts = parseInt(localStorage.getItem('karate-attempts') || '0', 10);
  const lockoutISO = localStorage.getItem('karate-lockout');
  const lockoutStart = lockoutISO ? new Date(lockoutISO).getTime() : null;
  return { attempts, lockoutStart };
}

function formatCountdown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PasswordGate({ children }) {
  const [authorized, setAuthorized] = useState(() => {
    return localStorage.getItem('karate-auth') === TEAM_PASSWORD;
  });
  const [entering, setEntering] = useState(false);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(() => readLockoutState().attempts);
  const [lockedUntil, setLockedUntil] = useState(() => {
    const { attempts: storedAttempts, lockoutStart } = readLockoutState();
    if (!lockoutStart || storedAttempts < 3) return null;
    const duration = getLockoutDuration(storedAttempts);
    const expiry = lockoutStart + duration;
    if (Date.now() >= expiry) {
      localStorage.removeItem('karate-lockout');
      return null;
    }
    return expiry;
  });
  const [remaining, setRemaining] = useState('');

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const diff = lockedUntil - Date.now();
      if (diff <= 0) {
        setLockedUntil(null);
        setRemaining('');
        localStorage.removeItem('karate-lockout');
      } else {
        setRemaining(formatCountdown(diff));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // "Entering the dojo" transition
  useEffect(() => {
    if (entering) {
      const timer = setTimeout(() => setAuthorized(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [entering]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (input === TEAM_PASSWORD) {
      localStorage.setItem('karate-auth', TEAM_PASSWORD);
      localStorage.removeItem('karate-attempts');
      localStorage.removeItem('karate-lockout');
      setEntering(true);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('karate-attempts', String(newAttempts));
      setInput('');

      if (newAttempts >= 3) {
        const now = new Date().toISOString();
        localStorage.setItem('karate-lockout', now);
        const duration = getLockoutDuration(newAttempts);
        setLockedUntil(Date.now() + duration);
      }
    }
  }, [input, attempts]);

  if (authorized) return children;

  if (entering) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full mx-4 text-center">
          <p className="text-3xl mb-4">🥋</p>
          <p className="text-xl font-bold text-blue-800">
            OOS. Enter in the Dojo.
          </p>
        </div>
      </div>
    );
  }

  // Lockout screen
  if (lockedUntil) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full mx-4 text-center">
          <p className="text-3xl mb-4">🚫</p>
          <p className="text-xl font-bold text-red-700 mb-2">
            Hansoku.
          </p>
          <p className="text-gray-600 mb-4">
            You are not among the descendants of Funakoshi and Tabata.
          </p>
          {remaining && (
            <p className="text-lg font-mono text-gray-800">
              Try again in {remaining}
            </p>
          )}
        </div>
      </div>
    );
  }

  const errorMessage = attempts > 0
    ? ERROR_MESSAGES[Math.min(attempts - 1, ERROR_MESSAGES.length - 1)]
    : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-2">
          Karate Black Belt Program
        </h1>
        <p className="text-gray-500 text-center mb-6">
          Enter the team password to continue
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Team password"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
            autoFocus
          />
          {errorMessage && (
            <p className="text-red-500 text-sm text-center mt-2 font-medium">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            className="w-full mt-4 px-4 py-3 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
