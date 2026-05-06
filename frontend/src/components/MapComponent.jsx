import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leafet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  if (center) {
    map.setView(center, zoom);
  }
  return null;
}

export default function MapComponent({ center, markers = [], volunteers = [], zones = [] }) {
  return (
    <MapContainer center={center || [0, 0]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {center && <ChangeView center={center} zoom={14} />}
      
      {center && (
        <Marker position={center} icon={redIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {markers.map((marker, idx) => (
        <Marker key={idx} position={marker.position} icon={redIcon}>
          <Popup>{marker.popup}</Popup>
        </Marker>
      ))}

      {volunteers.map((vol, idx) => (
        <Marker key={idx} position={vol.coordinates} icon={blueIcon}>
          <Popup>{vol.name} (Volunteer)</Popup>
        </Marker>
      ))}

      {zones.map((zone, idx) => (
        <Circle 
          key={idx} 
          center={[zone.location.coordinates[1], zone.location.coordinates[0]]} 
          pathOptions={{ 
            color: zone.type === 'safe-zone' ? 'green' : zone.type === 'hospital' ? 'blue' : 'orange',
            fillColor: zone.type === 'safe-zone' ? 'green' : zone.type === 'hospital' ? 'blue' : 'orange',
            fillOpacity: 0.2
          }} 
          radius={zone.radius}
        >
          <Popup>{zone.name} ({zone.type})</Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}
