
"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import type { PlateData } from '@/types';

const setupLeafletIcons = () => {
    if (typeof window !== 'undefined') {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
    }
};

type VehicleMapProps = {
  data: PlateData[];
  onFilter: (filteredData: PlateData[]) => void;
};

export default function VehicleMap({ data, onFilter }: VehicleMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
    
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) {
            return;
        }

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
        }

        setupLeafletIcons();

        const center: [number, number] = [-23.55052, -46.633303]; // São Paulo
        const map = L.map(mapContainerRef.current).setView(center, 11);
        mapInstanceRef.current = map;
        
        map.addLayer(drawnItemsRef.current);

        const drawControl = new L.Control.Draw({
            draw: {
                polygon: true,
                polyline: false,
                rectangle: true,
                circle: true,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItemsRef.current,
                remove: true,
            }
        });
        map.addControl(drawControl);

        map.on(L.Draw.Event.CREATED, (event: any) => {
            const layer = event.layer;
            drawnItemsRef.current.clearLayers();
            drawnItemsRef.current.addLayer(layer);
            filterMarkers(layer);
        });

        map.on(L.Draw.Event.EDITED, (event: any) => {
             const layers = event.layers;
             layers.eachLayer((layer: any) => {
                 filterMarkers(layer);
             });
        });
        
        map.on(L.Draw.Event.DELETED, () => {
             onFilter(data); // Reset filter when shapes are deleted
        });

        const filterMarkers = (layer: L.Layer) => {
            const geojson = (layer as L.Polygon).toGeoJSON();
            const poly = geojson.geometry;

            const filteredData = data.filter(item => {
                if (item.lat && item.lng && poly.type === 'Polygon') {
                    const point: [number, number] = [item.lng, item.lat];
                    let inside = false;
                    const polygonCoords = poly.coordinates[0];
                    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
                        const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
                        const xj = polygonCoords[j][0], yj = polygonCoords[j][1];

                        const intersect = ((yi > point[1]) !== (yj > point[1]))
                            && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                    }
                    return inside;
                }
                return false;
            });
            onFilter(filteredData);
            toast({
              title: "Filtro Aplicado",
              description: `${filteredData.length} veículos encontrados na área selecionada. Feche o mapa para ver os resultados.`
            });
        };


        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const markers = L.markerClusterGroup();
        
        const dataWithCoords = data.map(item => {
            if (item.lat && item.lng) {
              return { ...item, lat: item.lat, lng: item.lng };
            }
            return null;
        }).filter(Boolean) as (PlateData & { lat: number, lng: number })[];


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
    }, [data, onFilter]); 

    return (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    );
}

// Custom hook to show toast, as useToast can only be used in client components
function toast(props: { title: string; description: string }) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: props });
    window.dispatchEvent(event);
  }
}
