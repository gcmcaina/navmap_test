'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { Camera } from '@/lib/camera-data';

const Map = ({ cameras }: { cameras: Camera[] }) => {
  const customIcon = new Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  return (
    <MapContainer
      center={[-23.55052, -46.633308]} // São Paulo coordinates
      zoom={10}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cameras.map(camera => (
        <Marker key={camera.id} position={camera.coords} icon={customIcon}>
          <Popup>{camera.address}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
