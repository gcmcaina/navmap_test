
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
import { useToast } from "@/hooks/use-toast";
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


const setupLeafletIcons = () => {
    // This is a common fix for Leaflet with bundlers like Webpack/Next.js
    // It explicitly sets the paths for the default marker icons.
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://gcmcaina.github.io/navmap/assets/marker-icon2x.png',
        iconUrl: 'https://gcmcaina.github.io/navmap/assets/marker-icon.png',
        shadowUrl: markerShadow.src,
    });
};

type VehicleMapProps = {
  data: PlateData[];
  onFilter: (filteredData: PlateData[] | null) => void;
};

export default function VehicleMap({ data, onFilter }: VehicleMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
    const { toast } = useToast();
    
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
                polygon: {
                    allowIntersection: false,
                    shapeOptions: {
                        color: '#f06eaa'
                    }
                },
                rectangle: {
                     shapeOptions: {
                        color: '#f06eaa'
                    }
                },
                polyline: false,
                circle: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItemsRef.current,
                remove: true,
            }
        });
        map.addControl(drawControl);

        const filterMarkers = (layer: L.Layer) => {
            let bounds: L.LatLngBounds;
            let isPolygon = false;
        
            if (layer instanceof L.Polygon) {
                bounds = layer.getBounds();
                isPolygon = true;
            } else if (layer instanceof L.Rectangle) {
                bounds = layer.getBounds();
            } else {
                return;
            }
        
            const filteredData = data.filter(item => {
                if (item.lat && item.lng) {
                    const point = L.latLng(item.lat, item.lng);
                    if(isPolygon && layer instanceof L.Polygon) {
                        // More accurate check for polygon
                        let inside = false;
                        const polyPoints = layer.getLatLngs()[0] as L.LatLng[];
                        for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
                            const xi = polyPoints[i].lng, yi = polyPoints[i].lat;
                            const xj = polyPoints[j].lng, yj = polyPoints[j].lat;
        
                            const intersect = ((yi > point.lat) !== (yj > point.lat))
                                && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
                            if (intersect) inside = !inside;
                        }
                        return inside;
                    }
                    // Fallback to bounds check for rectangles or simple polygons
                    return bounds.contains(point);
                }
                return false;
            });
            
            onFilter(filteredData);
            toast({
              title: "Filtro Aplicado",
              description: `${filteredData.length} veículos encontrados na área selecionada. Feche o mapa para ver os resultados.`
            });
        };

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
             onFilter(null);
             toast({
              title: "Filtro Removido",
              description: "Exibindo todos os veículos."
            });
        });
        

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const markers = L.markerClusterGroup();
        
        const dataWithCoords = data.filter(item => typeof item.lat === 'number' && typeof item.lng === 'number') as (PlateData & { lat: number, lng: number })[];


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

            const bounds = markers.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
        
        // Ensure map resizes correctly
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [data, onFilter, toast]); 

    return (
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    );
}
