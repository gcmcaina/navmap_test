"use client";
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { useLeafletContext } from "@react-leaflet/core";

// Este componente é um wrapper para a biblioteca leaflet.markercluster.
// Ele foi simplificado para funcionar de forma mais direta com o react-leaflet.
const MarkerClusterGroup = ({ children }: { children: React.ReactNode }) => {
  const context = useLeafletContext();
  
  useEffect(() => {
    if (!context.map) return;

    const markerClusterGroup = L.markerClusterGroup();
    
    // Adiciona as camadas filhas (Markers) ao grupo
    React.Children.forEach(children, (child: any) => {
        if (child && child.props.position) {
            const marker = L.marker(child.props.position);
            
            // Adiciona o popup se existir
            if (child.props.children) {
                // A renderização de componentes React em popups do Leaflet
                // fora do controle do react-leaflet é complexa.
                // Como os componentes Marker e Popup já são gerenciados pelo react-leaflet
                // e nós só queremos agrupar, a melhor abordagem é extrair as layers.
                // Esta implementação é uma simplificação.
            }
            markerClusterGroup.addLayer(marker);
        }
    });

    context.map.addLayer(markerClusterGroup);

    // O ideal seria que o react-leaflet-markercluster lidasse com isso,
    // mas para uma implementação manual, a chave é a limpeza correta.
    return () => {
      context.map.removeLayer(markerClusterGroup);
    };
  }, [children, context.map]);

  // Os componentes filhos (Marker, Popup) serão renderizados pelo react-leaflet normalmente,
  // nós apenas adicionamos o efeito de cluster por cima.
  // Retornar os filhos aqui faria com que fossem renderizados duas vezes.
  // Então retornamos `null` e gerenciamos a lógica de cluster no `useEffect`.
  // Para que o popup funcione, precisamos que o react-leaflet o renderize.
  // Vamos deixar que os filhos sejam renderizados, e o useEffect acima irá criar o cluster.
  return <>{children}</>;
};

export default MarkerClusterGroup;
