import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import MapComponent from '../components/MapComponent';
import { api, buildAuthHeaders, getApiErrorMessage } from '../utils/api';
import { formatTimestamp, formatStatusLabel } from '../utils/formatters';
import { LogOut, AlertTriangle, Phone, Activity, History, Users, X, CheckCircle } from 'lucide-react';

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { success, error: showError, warning, info } = useToast();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [activeAlert, setActiveAlert] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [loadingSOS, setLoadingSOS] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [socketStatus, setSocketStatus] = useState('connected');
  const [activeTab, setActiveTab] = useState('sos');
  const [history, setHistory] = useState([]);
  const [contacts, setContacts] = useState(user?.emergencyContacts || []);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });

  const authHeaders = { headers: buildAuthHeaders(user.token) };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location access denied. Please enable GPS permissions.');
      setDashboardLoading(false);
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError('');

        if (socket) {
          socket.emit('update-location', coords);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied. Please enable GPS permissions.');
        } else {
          setLocationError('Unable to read GPS location right now.');
        }
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket]);

  useEffect(() => {
    const loadDashboard = async () => {
      setDashboardLoading(true);
      const results = await Promise.allSettled([
        fetchActiveAlert(),
        fetchVolunteers(),
        fetchHistory(),
      ]);

      const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason?.message).filter(Boolean);
      if (failures.length) {
        setDashboardError(failures[0]);
      }

      setDashboardLoading(false);
    };

    loadDashboard();

    if (socket) {
      const handleAlertUpdate = (updatedAlert) => {
        try {
          if (updatedAlert?.userId?._id === user._id || updatedAlert?.userId === user._id) {
            setActiveAlert(updatedAlert);

            if (updatedAlert?.status === 'accepted') {
              info('Volunteer assigned', `${updatedAlert.assignedVolunteerId?.name || updatedAlert.assignedVolunteerName || 'A responder'} is on the case.`);
            }

            if (updatedAlert?.status === 'completed') {
              setTimeout(() => {
                setActiveAlert(null);
                success('Incident completed', 'The emergency has been marked resolved.');
                fetchHistory();
              }, 1200);
            }
          }
        } catch (error) {
          setDashboardError('Received an invalid alert update.');
        }
      };

      const handleVolunteerLocation = (volunteerUpdate) => {
        setVolunteers((prev) => {
          const index = prev.findIndex((volunteer) => volunteer._id === volunteerUpdate.userId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              location: { ...updated[index].location, coordinates: volunteerUpdate.coordinates },
            };
            return updated;
          }
          return prev;
        });
      };

      const handleConnectError = () => {
        setSocketStatus('offline');
        warning('Live updates paused', 'Socket connection dropped. Retrying automatically.');
      };

      socket.on('alert-status-updated', handleAlertUpdate);
      socket.on('volunteer-location-update', handleVolunteerLocation);
      socket.on('disconnect', handleConnectError);
      socket.on('connect_error', handleConnectError);
      socket.on('connect', () => setSocketStatus('connected'));

      return () => {
        socket.off('alert-status-updated', handleAlertUpdate);
        socket.off('volunteer-location-update', handleVolunteerLocation);
        socket.off('disconnect', handleConnectError);
        socket.off('connect_error', handleConnectError);
        socket.off('connect');
      };
    }

    return undefined;
  }, [socket]);

  const fetchActiveAlert = async () => {
    const { data } = await api.get('/api/alerts/active', authHeaders);
    if (data !== null && data !== undefined && typeof data !== 'object') {
      throw new Error('Invalid active alert response.');
    }
    setActiveAlert(data);
  };

  const fetchHistory = async () => {
    const { data } = await api.get('/api/alerts/history', authHeaders);
    if (!Array.isArray(data)) {
      throw new Error('Invalid history response.');
    }
    setHistory(data);
  };

  const fetchVolunteers = async () => {
    const { data } = await api.get('/api/users/volunteers', authHeaders);
    if (!Array.isArray(data)) {
      throw new Error('Invalid volunteer response.');
    }
    setVolunteers(data);
  };

  const triggerSOS = async () => {
    if (!location) {
      const message = locationError || 'Location access denied. Please enable GPS permissions.';
      setDashboardError(message);
      warning('Location needed', message);
      return;
    }

    setLoadingSOS(true);
    setDashboardError('');

    try {
      const { data } = await api.post('/api/alerts', {
        coordinates: [location.lng, location.lat]
      }, authHeaders);

      if (!data?._id) {
        throw new Error('Invalid SOS response.');
      }

      setActiveAlert(data);
      success('SOS sent', 'Nearby volunteers have been notified.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to send SOS. Check internet connection.');
      setDashboardError(message);
      showError('SOS failed', message);
    } finally {
      setLoadingSOS(false);
    }
  };

  const addContact = async (e) => {
    e.preventDefault();
    try {
      const updatedContacts = [...contacts, newContact];
      const { data } = await api.put('/api/users/contacts', { contacts: updatedContacts }, authHeaders);
      if (!Array.isArray(data)) {
        throw new Error('Invalid contacts response.');
      }
      setContacts(data);
      setNewContact({ name: '', phone: '', relation: '' });
      success('Contact saved', 'Trusted contact updated successfully.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update contacts right now.');
      setDashboardError(message);
      showError('Contact update failed', message);
    }
  };

  const deleteContact = async (index) => {
    try {
      const updatedContacts = contacts.filter((_, i) => i !== index);
      const { data } = await api.put('/api/users/contacts', { contacts: updatedContacts }, authHeaders);
      if (!Array.isArray(data)) {
        throw new Error('Invalid contacts response.');
      }
      setContacts(data);
      info('Contact removed', 'Trusted contact deleted successfully.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update contacts right now.');
      setDashboardError(message);
      showError('Contact update failed', message);
    }
  };

  const volunteerMarkers = (volunteers || [])
    .filter(v => v?.location?.coordinates?.length >= 2)
    .map(v => ({
      _id: v._id,
      name: v.name,
      coordinates: [v.location.coordinates[1], v.location.coordinates[0]] // Leaflet needs [lat, lng]
    }));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 overflow-hidden">
      <div className="w-full md:w-96 bg-white shadow-xl z-10 flex flex-col h-full overflow-hidden border-r border-slate-200">
        <div className="p-6 bg-primary-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">AuraSafe</h2>
            <p className="text-primary-100 text-sm">Hello, {user.name}</p>
          </div>
          <button onClick={handleLogout} className="rounded-full bg-primary-700 p-2 transition hover:bg-primary-800" aria-label="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 shrink-0">
          <button onClick={() => setActiveTab('sos')} className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 ${activeTab === 'sos' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:bg-slate-50'}`}><AlertTriangle className="w-4 h-4"/> SOS</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:bg-slate-50'}`}><History className="w-4 h-4"/> History</button>
          <button onClick={() => setActiveTab('contacts')} className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 ${activeTab === 'contacts' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:bg-slate-50'}`}><Users className="w-4 h-4"/> Contacts</button>
        </div>

        {dashboardLoading && (
          <div className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            Loading dashboard...
          </div>
        )}
        {dashboardError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {dashboardError}
          </div>
        )}
        {socketStatus !== 'connected' && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Server temporarily unavailable. Live updates will reconnect automatically.
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {activeTab === 'sos' && (
            <div className="h-full flex flex-col items-center justify-center">
              {!activeAlert ? (
                <div className="text-center w-full">
                  <button 
                    onClick={triggerSOS}
                    disabled={loadingSOS || !location}
                    className={`w-56 h-56 md:w-64 md:h-64 rounded-full bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] flex flex-col items-center justify-center text-white font-black text-4xl border-8 border-red-200 transition-transform hover:scale-105 active:scale-95 mx-auto ${loadingSOS || !location ? 'opacity-75 cursor-not-allowed' : ''} animate-ping-slow`}
                    style={{ animationDuration: '3s' }}
                  >
                    <AlertTriangle className="w-16 h-16 mb-2" />
                    {loadingSOS ? 'Sending SOS...' : 'SOS'}
                  </button>
                  <p className="mt-8 text-slate-500 font-medium">{locationError || (loadingSOS ? 'Sending SOS...' : (volunteers.length === 0 ? 'No volunteers online right now.' : 'Tap immediately in emergency'))}</p>
                </div>
              ) : (
                <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-pulse">
                  <Activity className="w-16 h-16 text-red-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-red-700 mb-2">SOS Active</h3>
                  
                  {/* Incident Tracking Timeline */}
                  <div className="my-6 text-left relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {['created', 'accepted', 'en-route', 'completed'].map((step) => {
                      const stepInfo = activeAlert?.responseTimeline?.find((timelineStep) => timelineStep.status === step);
                      const isCompleted = Boolean(stepInfo);
                      return (
                        <div key={step} className="relative flex items-center justify-between group md:justify-normal md:odd:flex-row-reverse is-active">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isCompleted ? 'bg-primary-600' : 'bg-slate-300'}`}>
                            {isCompleted ? <CheckCircle className="h-4 w-4 text-white" /> : <div className="h-2 w-2 rounded-full bg-white"></div>}
                          </div>
                          <div className={`w-[calc(100%-4rem)] rounded border p-2 md:w-[calc(50%-2.5rem)] ${isCompleted ? 'border-primary-100 bg-white shadow-sm' : 'border-transparent bg-transparent text-slate-400'}`}>
                            <div className="flex items-center justify-between space-x-2">
                              <div className="text-sm font-bold capitalize">{formatStatusLabel(step)}</div>
                              <div className="text-xs text-slate-500">{formatTimestamp(stepInfo?.timestamp)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeAlert?.assignedVolunteerId ? (
                    <div className="bg-white p-4 rounded-xl shadow-sm text-left border border-red-100">
                      <p className="text-sm text-slate-500 mb-1">Assigned Volunteer</p>
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary-600" />
                        {activeAlert?.assignedVolunteerId?.name || activeAlert?.assignedVolunteerName || 'Volunteer'}
                      </p>
                      <a href={`tel:${activeAlert?.assignedVolunteerId?.phone || ''}`} className="mt-3 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800">
                        <Phone className="w-4 h-4" /> Call Responder
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-600 bg-white/60 p-3 rounded-lg font-medium">Waiting for nearby responder...</p>
                  )}

                  <div className="mt-4 rounded-lg bg-white/70 p-3 text-left text-xs text-slate-500">
                    <p className="font-bold text-slate-600">Live status</p>
                    <p className="mt-1">{formatStatusLabel(activeAlert?.status)} {activeAlert?.responseTimeline?.length ? `- ${activeAlert.responseTimeline.length} update${activeAlert.responseTimeline.length === 1 ? '' : 's'} recorded` : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Past Emergencies</h3>
              {!history || history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
                  <History className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                  <p>No emergency history available yet.</p>
                </div>
              ) : history.map((h) => (
                <div key={h._id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><History className="h-3 w-3" /> {formatTimestamp(h.createdAt)}</span>
                    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{formatStatusLabel(h.status)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Responder: {h.assignedVolunteerName || 'None'}</p>
                  <p className="mt-1 text-xs text-slate-500">{h.responseTimeline?.length ? `${h.responseTimeline.length} update${h.responseTimeline.length === 1 ? '' : 's'} logged` : 'No timeline updates captured.'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <form onSubmit={addContact} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Add Trusted Contact</h3>
                <input required placeholder="Full Name" value={newContact.name} onChange={e=>setNewContact({...newContact, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary-500" />
                <input required placeholder="Phone Number" value={newContact.phone} onChange={e=>setNewContact({...newContact, phone: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary-500" />
                <input required placeholder="Relation (e.g. Brother)" value={newContact.relation} onChange={e=>setNewContact({...newContact, relation: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary-500" />
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-sm hover:bg-slate-800">Add Contact</button>
              </form>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-800">My Contacts</h3>
                {!contacts || contacts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
                    <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    <p>No trusted contacts added yet.</p>
                  </div>
                ) : contacts.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.relation} • {c.phone}</p>
                    </div>
                    <button onClick={() => deleteContact(idx)} className="p-1 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-[400px]">
        <MapComponent 
          center={location ? [location.lat, location.lng] : null} 
          volunteers={volunteerMarkers}
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
