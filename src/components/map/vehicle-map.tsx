
"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import type { PlateData } from '@/types';
import { cameraCoordinates, type CameraCoordinate } from '@/lib/camera-coordinates';

// Configuração do ícone que estava causando problemas antes.
// Agora é seguro porque será chamado dentro do useEffect.
const setupLeafletIcons = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
};


export default function VehicleMap({ data }: { data: PlateData[] }) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        // Garante que o código só será executado no cliente
        if (typeof window === 'undefined' || !mapContainerRef.current) {
            return;
        }

        // Evita reinicialização se o mapa já existir
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        setupLeafletIcons();

        const center: [number, number] = [-23.55052, -46.633303]; // São Paulo
        const map = L.map(mapContainerRef.current).setView(center, 11);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const coordinateMap = new Map<string, CameraCoordinate>(
            cameraCoordinates.map(c => [c.id, c])
        );

        const markers = L.markerClusterGroup();

        const dataWithCoords = data.map(item => {
            if (!item.CameraID) return null;
            const coord = coordinateMap.get(item.CameraID);
            if (!coord) return null;
            return { ...item, lat: coord.lat, lng: coord.lng };
        }).filter(Boolean) as (PlateData & CameraCoordinate)[];


        if (dataWithCoords.length > 0) {
            dataWithCoords.forEach(item => {
                const position: [number, number] = [item.lat, item.lng];
                const popupContent = `
                    <div class="w-64">
                        <div class="relative w-full h-40 mb-2 overflow-hidden rounded-md">
                            <img src="${item['Image URL']}" alt="${item['License Plate'] || 'Imagem'}" style="width:100%; height:100%; object-fit:cover;" />
                        </div>
                        <p class="font-bold text-lg">${item['License Plate']}</p>
                        <p>${item.CameraAddress || ''}</p>
                        ${item['Detected At'] ? `<p class="text-sm text-gray-500">${new Date(item['Detected At']).toLocaleString()}</p>` : ''}
                    </div>
                `;
                
                const marker = L.marker(position).bindPopup(popupContent);
                markers.addLayer(marker);
            });
    
            map.addLayer(markers);

            const bounds = L.latLngBounds(dataWithCoords.map(item => [item.lat, item.lng]));
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
        
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [data]); 

    return (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    );
}
