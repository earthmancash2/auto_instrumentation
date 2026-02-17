'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear any old tokens when login page loads
  useEffect(() => {
    localStorage.removeItem('auth_token');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login - creates a unique account each time
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Create a unique demo account
      const timestamp = Date.now();
      const demoEmail = `demo${timestamp}@marketplace.test`;
      const demoUsername = `demo${timestamp}`;

      setSuccess('Creating demo account...');

      const result = await api.register({
        email: demoEmail,
        username: demoUsername,
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User',
        role: 'buyer',
      });

      setSuccess('Success! Redirecting...');

      // Small delay to show success message
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 500);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError(err.response?.data?.error || 'Failed to create demo account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Login</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="border rounded-lg p-6 mb-4">
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : '🚀 Quick Demo Login'}
        </button>
        <p className="text-sm text-gray-600 text-center mt-2">
          Creates a test account automatically
        </p>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or login manually</span>
        </div>
      </div>

      <form onSubmit={handleLogin} className="border rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-sm text-gray-600 text-center mt-4">
        This is a demo app. Use "Quick Demo Login" for easy testing.
      </p>
    </div>
  );
}
