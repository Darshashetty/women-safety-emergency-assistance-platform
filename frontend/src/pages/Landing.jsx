import { Link } from 'react-router-dom';
import { Shield, Users, Activity } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-600 font-bold text-xl">
          <Shield className="w-8 h-8" />
          <span>AuraSafe</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="text-slate-600 hover:text-primary-600 font-medium py-2">Login</Link>
          <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Sign Up</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 md:px-12 py-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">
          Your Safety, <span className="text-primary-600">Our Priority</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mb-10">
          AuraSafe connects women with trusted volunteers and authorities instantly during emergencies. Help is just one click away.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Instant SOS</h3>
            <p className="text-slate-500 text-center">Trigger an emergency alert to nearby volunteers with a single tap.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Trusted Volunteers</h3>
            <p className="text-slate-500 text-center">A network of verified volunteers ready to provide immediate assistance.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Live Tracking</h3>
            <p className="text-slate-500 text-center">Real-time location sharing ensures help reaches you exactly where you are.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
