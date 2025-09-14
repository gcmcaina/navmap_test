
"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { PlateData } from '@/types';
import { cameraCoordinates, type CameraCoordinate } from '@/lib/camera-coordinates';
import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import MarkerClusterGroup from './marker-cluster-group';


// Configuração global do ícone do Leaflet para ser executada apenas uma vez no cliente.
useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
}, []);


export default function VehicleMap({ data }: { data: PlateData[] }) {
  
  const center: [number, number] = [-23.55052, -46.633303]; // São Paulo center

  const coordinateMap = useMemo(() => new Map<string, CameraCoordinate>(
    cameraCoordinates.map(c => [c.id, c])
  ), []);

  const markers = useMemo(() => data
    .map(item => {
      if (!item.CameraID) return null;
      const coord = coordinateMap.get(item.CameraID);
      if (!coord) return null;

      return {
        ...item,
        position: [coord.lat, coord.lng] as [number, number],
      };
    })
    .filter((item): item is PlateData & { position: [number, number] } => item !== null), [data, coordinateMap]);

  return (
    <MapContainer 
        center={center} 
        zoom={11} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup>
        {markers.map((item) => (
          <Marker key={item.id} position={item.position}>
            <Popup>
              <div className="w-64">
                <div className="relative w-full h-40 mb-2">
                    <Image src={item['Image URL']} alt={item['License Plate'] || 'Imagem'} fill style={{objectFit: 'cover'}} unoptimized/>
                </div>
                <p className="font-bold text-lg">{item['License Plate']}</p>
                <p>{item.CameraAddress}</p>
                {item['Detected At'] && <p className="text-sm text-muted-foreground">{new Date(item['Detected At']).toLocaleString()}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
