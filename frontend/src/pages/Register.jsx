import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield } from 'lucide-react';
import { getApiErrorMessage } from '../utils/api';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await register(formData);
      success('Account created', 'Your AuraSafe profile is ready.');

      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'volunteer') navigate('/volunteer/dashboard', { replace: true });
      else navigate('/user/dashboard', { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to register right now.');
      setError(message);
      showError('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-primary-600 p-8 text-center text-white">
          <Shield className="mx-auto mb-2 h-12 w-12" />
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="mt-2 text-primary-100">Join AuraSafe today</p>
        </div>

        <div className="p-8">
          {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input name="name" type="text" required className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500" onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" required className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500" onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
              <input name="phone" type="tel" required className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500" onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input name="password" type="password" required className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500" onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">I am a...</label>
              <select name="role" className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500" onChange={handleChange}>
                <option value="user">User (Need Safety App)</option>
                <option value="volunteer">Volunteer (Ready to Help)</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-3 font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-600">
            Already have an account? <Link to="/login" className="font-bold text-primary-600 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
