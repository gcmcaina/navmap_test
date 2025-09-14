
"use client";
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { useLeafletContext } from "@react-leaflet/core";
import { renderToStaticMarkup } from 'react-dom/server';

const MarkerClusterGroup = ({ children }: { children: React.ReactNode }) => {
  const context = useLeafletContext();

  useEffect(() => {
    if (!context.map) return;

    const markerClusterGroup = L.markerClusterGroup();

    const markers: L.Marker[] = [];
    React.Children.forEach(children, (child: any) => {
      if (child && child.props.position) {
        const marker = L.marker(child.props.position, { icon: child.props.icon });
        
        if (child.props.children) {
          const popupContent = renderToStaticMarkup(child.props.children);
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

    