import React, { useState } from 'react';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';

interface PasswordGateProps {
  onLogin: () => void;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate a small delay for better UX
    setTimeout(() => {
      const envPassword = import.meta.env.VITE_APP_PASSWORD;
      
      if (password === envPassword) {
        onLogin();
      } else {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-rose-100 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
            <LockIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Protected Access</h1>
          <p className="text-gray-500 mt-2">Please enter the password to access the application.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors outline-none"
                placeholder="Enter password"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <UnlockIcon className="w-5 h-5" />
                Access Application
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Protected Environment • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
