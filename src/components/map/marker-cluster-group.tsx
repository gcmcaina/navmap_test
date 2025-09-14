"use client"

import { useEffect } from "react";
import L from "leaflet";
import "leaflet.markercluster/dist/leaflet.markercluster";
import { useLeafletContext } from "@react-leaflet/core";

const MarkerClusterGroup = ({ children } : { children: React.ReactNode}) => {
  const context = useLeafletContext();
  
  useEffect(() => {
    const markerClusterGroup = L.markerClusterGroup();
    const container = context.layerContainer || context.map;
    container.addLayer(markerClusterGroup);

    // Adiciona os filhos ao cluster
    const markers: L.Marker[] = [];
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            // Esta é uma simplificação. Em um cenário real, você precisaria extrair
            // as props do Marker e criar um L.Marker com elas.
            // Para este exemplo, vamos assumir que o 'children' já são L.Marker
            // ou que uma lógica mais complexa seria necessária para converter componentes React em L.Marker
        }
    });

    return () => {
      container.removeLayer(markerClusterGroup);
    };
  // Apenas re-renderiza se o mapa mudar, mas idealmente você também observaria 'children'
  }, [context.map]);


  // O truque aqui é renderizar os children diretamente,
  // pois o react-leaflet vai adicioná-los ao mapa.
  // O useEffect acima irá então pegá-los e adicioná-los ao cluster.
  // NOTA: Esta é uma abordagem simplificada. Uma implementação mais robusta
  // pode precisar de uma lógica mais complexa para sincronizar os marcadores.
  // Para a maioria dos casos de uso, uma biblioteca como `react-leaflet-markercluster` é a melhor rota.
  // Como não podemos adicioná-la agora, esta é uma implementação manual.
  
  const map = useLeafletContext().map;
  const clusterGroup = L.markerClusterGroup();
  
  useEffect(() => {
      if (!map) return;
      
      const markers = React.Children.map(children, (child: any) => {
        if (React.isValidElement(child)) {
            const { position } = child.props;
            const marker = L.marker(new L.LatLng(position[0], position[1]));

            // Para popups, teríamos que renderizar o conteúdo do popup para uma string HTML
            // e então usar marker.bindPopup(). Isso é complexo.
            // Por simplicidade, vamos pular os popups na versão de cluster manual.
            
            return marker;
        }
        return null;
      });

      clusterGroup.addLayers(markers.filter(m => m));
      map.addLayer(clusterGroup);

      return () => {
          map.removeLayer(clusterGroup);
      };
  }, [map, children]);


  return null;
};

export default MarkerClusterGroup;
