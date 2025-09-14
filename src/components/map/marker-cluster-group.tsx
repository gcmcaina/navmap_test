import { useEffect } from 'react';
import { useLeafletContext } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const MarkerClusterGroup = ({ children }: { children: React.ReactNode | React.ReactNode[] }) => {
  const context = useLeafletContext();

  useEffect(() => {
    const markerClusterGroup = L.markerClusterGroup();

    const markers: L.Marker[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const { position } = child.props;
        const popupContent = child.props.children ? renderToStaticMarkup(child.props.children) : '';
        
        const marker = L.marker(new L.LatLng(position[0], position[1]), {
          icon: new L.Icon.Default(),
        });
        
        if (popupContent) {
          marker.bindPopup(popupContent);
        }
        
        markers.push(marker);
      }
    });

    markerClusterGroup.addLayers(markers);
    context.map.addLayer(markerClusterGroup);

    return () => {
      context.map.removeLayer(markerClusterGroup);
    };
  }, [children, context.map]);

  return null;
};

export default MarkerClusterGroup;
