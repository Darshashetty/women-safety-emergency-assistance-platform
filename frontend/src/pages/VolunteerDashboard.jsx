import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import MapComponent from '../components/MapComponent';
import { api, buildAuthHeaders, getApiErrorMessage } from '../utils/api';
import { formatStatusLabel, formatTimestamp } from '../utils/formatters';
import { LogOut, MapPin, CheckCircle, Navigation, ShieldAlert, Phone } from 'lucide-react';

export default function VolunteerDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { success, error: showError, warning, info } = useToast();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [socketStatus, setSocketStatus] = useState('connected');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [audio] = useState(new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location access denied. Please enable GPS permissions.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError('');
        if (socket) socket.emit('update-location', coords);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED ? 'Location access denied. Please enable GPS permissions.' : 'Unable to read GPS location right now.');
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket]);

  useEffect(() => {
    const fetchAlerts = async () => {
      setDashboardLoading(true);
      try {
        const { data } = await api.get('/api/alerts/queue', { headers: buildAuthHeaders(user.token) });
        if (!Array.isArray(data)) {
          throw new Error('Invalid alert queue response.');
        }
        setAlerts(data);
      } catch (error) {
        const message = getApiErrorMessage(error, 'Unable to load emergency queue right now.');
        setDashboardError(message);
        showError('Queue unavailable', message);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchAlerts();

    if (socket) {
      const handleNewAlert = (alert) => {
        setAlerts((prev) => [alert, ...prev]);
        audio.loop = true;
        audio.play().catch(() => {});
        success('New SOS received', `Emergency from ${alert.userId?.name || 'a user'}.`);
      };

      const handleStatusUpdate = (updatedAlert) => {
        setAlerts((prev) => prev.map((alert) => (alert._id === updatedAlert._id ? updatedAlert : alert)));
        if (updatedAlert.status === 'completed') {
          audio.pause();
          audio.currentTime = 0;
          info('Incident completed', 'The active emergency was resolved.');
        } else if (updatedAlert.status === 'accepted') {
          audio.pause();
          audio.currentTime = 0;
          warning('Request accepted', 'A volunteer has taken ownership of this alert.');
        }
      };

      const handleUserLocation = (data) => {
        setAlerts((prev) => prev.map((alert) => {
          if (alert.userId?._id === data.userId || alert.userId === data.userId) {
            return { ...alert, location: { ...alert.location, coordinates: data.coordinates } };
          }
          return alert;
        }));
      };

      const handleDisconnect = () => {
        setSocketStatus('offline');
        setDashboardError('Server temporarily unavailable.');
      };

      socket.on('new-alert', handleNewAlert);
      socket.on('alert-status-updated', handleStatusUpdate);
      socket.on('user-location-update', handleUserLocation);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleDisconnect);
      socket.on('connect', () => setSocketStatus('connected'));

      return () => {
        socket.off('new-alert', handleNewAlert);
        socket.off('alert-status-updated', handleStatusUpdate);
        socket.off('user-location-update', handleUserLocation);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleDisconnect);
        socket.off('connect');
        audio.pause();
      };
    }

    return undefined;
  }, [socket]);

  const updateAlertStatus = async (alertId, status) => {
    setActionLoadingId(alertId);
    try {
      const { data } = await api.put(`/api/alerts/${alertId}/status`, { status }, { headers: buildAuthHeaders(user.token) });
      if (!data?._id) {
        throw new Error('Invalid alert update response.');
      }
      audio.pause();
      audio.currentTime = 0;
      const statusLabel = formatStatusLabel(status);
      success('Alert updated', `Status changed to ${statusLabel}.`);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update emergency status.');
      setDashboardError(message);
      showError('Status update failed', message);
    } finally {
      setActionLoadingId('');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const markers = alerts.filter(a => a.status !== 'completed').map(a => ({
    position: [a.location.coordinates[1], a.location.coordinates[0]],
    popup: `SOS from ${a.userId?.name || 'User'} - Status: ${a.status}`
  }));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100">
      <div className="w-full md:w-[400px] bg-white shadow-xl z-10 flex flex-col h-full overflow-hidden border-r border-slate-200">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Dispatcher</h2>
            <p className="text-slate-400 text-sm">Volunteer: {user.name}</p>
          </div>
          <button onClick={handleLogout} className="rounded-full bg-slate-800 p-2 transition hover:bg-slate-700" aria-label="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {dashboardLoading && <div className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">Loading dashboard...</div>}
        {dashboardError && <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{dashboardError}</div>}
        {socketStatus !== 'connected' && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">Server temporarily unavailable. Live updates will reconnect automatically.</div>}
        {locationError && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">{locationError}</div>}

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          <h3 className="font-bold text-slate-700 px-2">Active Emergency Requests</h3>
          {alerts.filter((alert) => alert.status !== 'completed').length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              <CheckCircle className="mx-auto mb-2 h-12 w-12 text-slate-300" />
              <p>No active emergencies nearby. Stand by.</p>
            </div>
          ) : (
            alerts.filter((alert) => alert.status !== 'completed').map((alert) => {
              const statusLabel = formatStatusLabel(alert.status);
              const isAssignedToMe = (alert.assignedVolunteerId?._id || alert.assignedVolunteerId) === user._id;
              const createdAtLabel = formatTimestamp(alert.createdAt);

              return (
                <div key={alert._id} className={`rounded-xl border p-4 shadow-sm ${alert.status === 'created' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{alert.userId?.name || 'Unknown User'}</h4>
                      <p className="mt-1 text-xs text-slate-500">{createdAtLabel}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {location ? `${calculateDistance(location.lat, location.lng, alert.location.coordinates[1], alert.location.coordinates[0])} km away` : 'Calculating distance...'}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      alert.status === 'created' ? 'bg-red-100 text-red-700' :
                      alert.status === 'accepted' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>

                  {alert.userId?.phone && (
                    <p className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" /> {alert.userId.phone}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {alert.status === 'created' && (
                      <button onClick={() => updateAlertStatus(alert._id, 'accepted')} disabled={actionLoadingId === alert._id} className="flex-1 rounded-lg bg-red-600 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70">
                        {actionLoadingId === alert._id ? 'Updating emergency status...' : 'Accept Request'}
                      </button>
                    )}
                    {alert.status === 'accepted' && isAssignedToMe && (
                      <button onClick={() => updateAlertStatus(alert._id, 'en-route')} disabled={actionLoadingId === alert._id} className="flex-1 rounded-lg bg-orange-500 py-2 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2">
                        <Navigation className="h-4 w-4" /> {actionLoadingId === alert._id ? 'Updating emergency status...' : 'En Route'}
                      </button>
                    )}
                    {alert.status === 'en-route' && isAssignedToMe && (
                      <button onClick={() => updateAlertStatus(alert._id, 'completed')} disabled={actionLoadingId === alert._id} className="flex-1 rounded-lg bg-green-600 py-2 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4" /> {actionLoadingId === alert._id ? 'Updating emergency status...' : 'Mark Completed'}
                      </button>
                    )}
                    {alert.status !== 'created' && !isAssignedToMe && (
                      <div className="w-full rounded-lg bg-slate-100 py-2 text-center text-sm font-medium text-slate-500">
                        Handled by {alert.assignedVolunteerId?.name || alert.assignedVolunteerName || 'Another Volunteer'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-slate-200">
        <MapComponent 
          center={location ? [location.lat, location.lng] : null} 
          markers={markers}
        />
        {!location && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-lg font-bold text-slate-700">Locating GPS Signal...</p>
            <p className="mt-2 text-sm text-slate-500">Please ensure location permissions are granted.</p>
          </div>
        )}
      </div>
    </div>
  );
}
