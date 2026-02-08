import { useState } from 'react';

const TEAM_PASSWORD = 'Karatediplomacy@2026';

export default function PasswordGate({ children }) {
  const [authorized, setAuthorized] = useState(() => {
    return localStorage.getItem('karate-auth') === TEAM_PASSWORD;
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === TEAM_PASSWORD) {
      localStorage.setItem('karate-auth', TEAM_PASSWORD);
      setAuthorized(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  if (authorized) return children;

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
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Team password"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm text-center mt-2">
              Incorrect password. Try again.
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
