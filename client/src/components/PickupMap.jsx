import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

function ClickPicker({ onPick }) {
  useMapEvents({ click(event) { onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng }); } });
  return null;
}

export default function PickupMap({ value, onChange, readOnly = false }) {
  const center = value?.latitude != null && value?.longitude != null
    ? [value.latitude, value.longitude]
    : [20.5937, 78.9629];
  const openMaps = value?.latitude != null && value?.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`
    : null;

  return (
    <div>
      <MapContainer center={center} zoom={value?.latitude != null ? 17 : 5} style={{ height: 280, width: '100%', borderRadius: 12 }} scrollWheelZoom={!readOnly}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && <ClickPicker onPick={onChange} />}
        {value?.latitude != null && value?.longitude != null && <Marker position={[value.latitude, value.longitude]} icon={icon} />}
      </MapContainer>
      {!readOnly && <p style={{ marginTop: 8 }}>Click the map to set the exact pickup point.</p>}
      {openMaps && <a href={openMaps} target="_blank" rel="noreferrer">Open this location in Google Maps ↗</a>}
    </div>
  );
}
