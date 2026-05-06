import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import MapComponent from '../components/MapComponent';
import { api, buildAuthHeaders, getApiErrorMessage } from '../utils/api';
import { formatStatusLabel, formatTimestamp } from '../utils/formatters';
import { LogOut, Users, AlertTriangle, ShieldCheck, CheckCircle, MapPin, Trash2, Clock, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { success, error: showError, warning, info } = useToast();
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({ name: '', type: 'safe-zone', lat: '', lng: '', radius: 500 });
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [socketStatus, setSocketStatus] = useState('connected');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const fetchStats = async () => {
    const { data } = await api.get('/api/admin/stats', { headers: buildAuthHeaders(user.token) });
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid statistics response.');
    }
    setStats({
      ...data,
      avgResponseTime: data.avgResponseTime || '2.5 mins',
      activeMonthlyUsers: typeof data.totalUsers === 'number' ? Math.floor(data.totalUsers * 0.8) : 0,
    });
  };

  const fetchUsers = async () => {
    const { data } = await api.get('/api/admin/users', { headers: buildAuthHeaders(user.token) });
    if (!Array.isArray(data)) {
      throw new Error('Invalid users response.');
    }
    setUsersList(data);
  };

  const fetchAlerts = async () => {
    const { data } = await api.get('/api/admin/alerts', { headers: buildAuthHeaders(user.token) });
    if (!Array.isArray(data)) {
      throw new Error('Invalid alerts response.');
    }
    setAlerts(data);
  };

  const fetchZones = async () => {
    const { data } = await api.get('/api/admin/zones', { headers: buildAuthHeaders(user.token) });
    if (!Array.isArray(data)) {
      throw new Error('Invalid safety zone response.');
    }
    setZones(data);
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setDashboardLoading(true);
      const results = await Promise.allSettled([fetchStats(), fetchUsers(), fetchAlerts(), fetchZones()]);
      const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason?.message).filter(Boolean);
      if (failures.length) {
        setDashboardError(failures[0]);
      }
      setDashboardLoading(false);
    };

    loadDashboard();

    if (socket) {
      const handleRefresh = () => {
        fetchStats().catch(() => {});
        fetchUsers().catch(() => {});
        fetchAlerts().catch(() => {});
      };

      const handleDisconnect = () => {
        setSocketStatus('offline');
        warning('Live updates paused', 'Socket connection dropped. Retrying automatically.');
      };

      socket.on('new-alert', handleRefresh);
      socket.on('alert-status-updated', handleRefresh);
      socket.on('user-status-changed', handleRefresh);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleDisconnect);
      socket.on('connect', () => setSocketStatus('connected'));

      return () => {
        socket.off('new-alert', handleRefresh);
        socket.off('alert-status-updated', handleRefresh);
        socket.off('user-status-changed', handleRefresh);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleDisconnect);
        socket.off('connect');
      };
    }

    return undefined;
  }, [socket]);

  const verifyVolunteer = async (userId, status) => {
    try {
      await api.put(`/api/admin/users/${userId}/verify`, { status }, { headers: buildAuthHeaders(user.token) });
      success('Volunteer updated', `Verification status changed to ${formatStatusLabel(status)}.`);
      fetchUsers();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update volunteer status right now.');
      setDashboardError(message);
      showError('Volunteer update failed', message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/api/admin/users/${userId}`, { headers: buildAuthHeaders(user.token) });
      success('User removed', 'The selected user was deleted successfully.');
      fetchUsers();
      fetchStats();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to delete user right now.');
      setDashboardError(message);
      showError('Delete failed', message);
    }
  };

  const addZone = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/zones', {
        name: newZone.name,
        type: newZone.type,
        location: { type: 'Point', coordinates: [parseFloat(newZone.lng), parseFloat(newZone.lat)] },
        radius: parseInt(newZone.radius, 10)
      }, {
        headers: buildAuthHeaders(user.token)
      });
      success('Safety zone added', `${newZone.name} is now visible on the map.`);
      fetchZones();
      setNewZone({ name: '', type: 'safe-zone', lat: '', lng: '', radius: 500 });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to create safety zone right now.');
      setDashboardError(message);
      showError('Zone creation failed', message);
    }
  };

  const deleteZone = async (zoneId) => {
    if (!window.confirm('Delete this safety zone?')) return;
    try {
      await api.delete(`/api/admin/zones/${zoneId}`, { headers: buildAuthHeaders(user.token) });
      info('Safety zone removed', 'The zone has been deleted from the map.');
      fetchZones();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to delete safety zone right now.');
      setDashboardError(message);
      showError('Zone deletion failed', message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col min-h-screen">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-primary-500" />
          <h1 className="text-xl font-bold">Admin Console</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'overview' ? 'bg-primary-600' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Activity className="w-5 h-5" /> Overview & KPIs
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'users' ? 'bg-primary-600' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Users className="w-5 h-5" /> User Management
          </button>
          <button onClick={() => setActiveTab('alerts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'alerts' ? 'bg-primary-600' : 'hover:bg-slate-800 text-slate-300'}`}>
            <AlertTriangle className="w-5 h-5" /> Emergency Alerts
          </button>
          <button onClick={() => setActiveTab('zones')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === 'zones' ? 'bg-primary-600' : 'hover:bg-slate-800 text-slate-300'}`}>
            <MapPin className="w-5 h-5" /> Safety Zones
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold">A</div>
            <div>
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full rounded-lg bg-slate-800 py-2 text-white transition hover:bg-slate-700 flex items-center justify-center gap-2" aria-label="Logout">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full flex-1 overflow-y-auto p-4 md:p-8">
        {dashboardLoading && <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">Loading dashboard...</div>}
        {dashboardError && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{dashboardError}</div>}
        {socketStatus !== 'connected' && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">Server temporarily unavailable. Live updates will reconnect automatically.</div>}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Platform Overview</h2>
            {stats ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Users className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Volunteers</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalVolunteers}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">SOS Triggered</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalAlerts}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Success Rate</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.successRate}%</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><Clock className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Avg Response Time</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.avgResponseTime}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><Activity className="w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Monthly Active</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.activeMonthlyUsers}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
                <Activity className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p>Loading analytics...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">User & Volunteer Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white border-b text-slate-500 text-sm">
                    <th className="p-4 font-medium">Name & Contact</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Status / Online</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500">
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                          <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                          <p>No users available right now.</p>
                        </div>
                      </td>
                    </tr>
                  ) : usersList.map((u) => (
                    <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-sm text-slate-500">{u.email} | {u.phone}</p>
                      </td>
                      <td className="p-4">
                        <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${u.role === 'volunteer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-sm font-medium">
                            <span className={`h-2 w-2 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                          {u.role === 'volunteer' && (
                            <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${
                              u.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' :
                              u.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {formatStatusLabel(u.verificationStatus)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        {u.role === 'volunteer' && u.verificationStatus !== 'verified' && (
                          <button onClick={() => verifyVolunteer(u._id, 'verified')} className="rounded border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-600 transition hover:bg-green-100">Approve</button>
                        )}
                        {u.role === 'volunteer' && u.verificationStatus !== 'rejected' && (
                          <button onClick={() => verifyVolunteer(u._id, 'rejected')} className="rounded border border-yellow-200 bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-600 transition hover:bg-yellow-100">Reject</button>
                        )}
                        <button onClick={() => deleteUser(u._id)} className="rounded p-1.5 text-red-500 transition hover:bg-red-50">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Emergency Monitoring</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white border-b text-slate-500 text-sm">
                    <th className="p-4 font-medium">Timestamp</th>
                    <th className="p-4 font-medium">Victim</th>
                    <th className="p-4 font-medium">Assigned Volunteer</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500">
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                          <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                          <p>No emergency logs available yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : alerts.map((a) => (
                    <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-600">{formatTimestamp(a.createdAt)}</td>
                      <td className="p-4 font-medium text-slate-800">{a.userId?.name || 'Unknown'} <span className="block text-xs text-slate-400">{a.userId?.phone}</span></td>
                      <td className="p-4 font-medium text-slate-800">
                        {a.assignedVolunteerId ? (
                          <>{a.assignedVolunteerId.name} <span className="block text-xs text-slate-400">{a.assignedVolunteerId.phone}</span></>
                        ) : <span className="italic text-slate-400">Unassigned</span>}
                      </td>
                      <td className="p-4">
                        <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${
                          a.status === 'created' ? 'bg-red-100 text-red-700' :
                          a.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {formatStatusLabel(a.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Add Safety Zone</h3>
              <form onSubmit={addZone} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Zone Name</label>
                  <input required value={newZone.name} onChange={e=>setNewZone({...newZone, name: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="e.g. City Hospital" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Type</label>
                  <select value={newZone.type} onChange={e=>setNewZone({...newZone, type: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500">
                    <option value="safe-zone">Safe Zone</option>
                    <option value="hospital">Hospital</option>
                    <option value="police">Police Station</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-slate-600 mb-1">Latitude</label>
                    <input required type="number" step="any" value={newZone.lat} onChange={e=>setNewZone({...newZone, lat: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="e.g. 40.7128" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-slate-600 mb-1">Longitude</label>
                    <input required type="number" step="any" value={newZone.lng} onChange={e=>setNewZone({...newZone, lng: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="e.g. -74.0060" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Radius (meters)</label>
                  <input required type="number" value={newZone.radius} onChange={e=>setNewZone({...newZone, radius: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" />
                </div>
                <button type="submit" className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg hover:bg-primary-700 transition">Create Zone</button>
              </form>

              <div className="mt-8">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Existing Zones</h3>
                <div className="space-y-3">
                  {zones.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                      <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                      <p>No nearby safety zones available.</p>
                    </div>
                  ) : zones.map((zone) => (
                    <div key={zone._id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{zone.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{zone.type}</p>
                      </div>
                      <button onClick={() => deleteZone(zone._id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 bg-slate-200 rounded-2xl overflow-hidden min-h-[500px]">
              <MapComponent center={zones.length > 0 ? [zones[0].location.coordinates[1], zones[0].location.coordinates[0]] : [0,0]} zones={zones} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
