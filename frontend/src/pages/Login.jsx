import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield } from 'lucide-react';
import { getApiErrorMessage } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      success('Login successful', 'Redirecting to your dashboard.');

      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'volunteer') navigate('/volunteer/dashboard', { replace: true });
      else navigate('/user/dashboard', { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to sign in right now.');
      setError(message);
      showError('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-primary-600 p-8 text-center text-white">
          <Shield className="mx-auto mb-2 h-12 w-12" />
          <h2 className="text-3xl font-bold">Welcome Back</h2>
          <p className="mt-2 text-primary-100">Sign in to continue</p>
        </div>

        <div className="p-8">
          {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-600">
            Don&apos;t have an account? <Link to="/register" className="font-bold text-primary-600 hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
