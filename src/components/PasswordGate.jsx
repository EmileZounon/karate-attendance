import { useState, useEffect } from 'react';

const TEAM_PASSWORD = 'Karatediplomacy@2026';

const ERROR_MESSAGES = [
  'Keikoku. Try again.',
  'Hansoku-Chui. Do 2 Sochin and Try again.',
  'Hansoku. You are not among the descendants of Funakoshi and Tabata.',
];

export default function PasswordGate({ children }) {
  const [authorized, setAuthorized] = useState(() => {
    return localStorage.getItem('karate-auth') === TEAM_PASSWORD;
  });
  const [entering, setEntering] = useState(false);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === TEAM_PASSWORD) {
      localStorage.setItem('karate-auth', TEAM_PASSWORD);
      setEntering(true);
    } else {
      setAttempts((prev) => prev + 1);
      setInput('');
    }
  };

  useEffect(() => {
    if (entering) {
      const timer = setTimeout(() => setAuthorized(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [entering]);

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
