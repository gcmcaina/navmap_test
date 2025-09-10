
import React, { useRef, useEffect, useState } from 'react';
import type { PlateData } from '@/types';

interface ReportTemplateProps {
  data: PlateData[];
  title?: string;
  onImagesLoaded?: () => void;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ data, title = "Relatório de Veículos", onImagesLoaded }) => {
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);
  const totalImages = data.length;

  useEffect(() => {
    if (onImagesLoaded && loadedImagesCount === totalImages) {
      onImagesLoaded();
    }
  }, [loadedImagesCount, totalImages, onImagesLoaded]);

  const handleImageLoad = () => {
    setLoadedImagesCount(prev => prev + 1);
  };

  const handleImageError = () => {
    // Also count errors as "loaded" to prevent the process from stalling.
    setLoadedImagesCount(prev => prev + 1);
  };

  return (
    <div id="report-content" className="p-8 bg-white text-black">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-br')}</p>
        <p className="text-sm text-gray-600">Total de veículos: {data.length}</p>
      </header>
      
      <main>
        <div className="grid grid-cols-1 gap-6">
          {data.map((item, index) => (
            <div key={item.id} className="p-4 border border-gray-300 rounded-lg flex items-start gap-4 break-inside-avoid">
              <div className="flex-shrink-0 w-48 h-48 relative">
                <img 
                  ref={el => imageRefs.current[index] = el}
                  src={item['Image URL']} 
                  alt={item['License Plate'] || 'Veículo'} 
                  className="w-full h-full object-cover rounded-md"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-bold mb-2">{item['License Plate'] || "Placa não identificada"}</h2>
                <div className="space-y-1 text-sm">
                  {item.Marca && item.Marca !== "Marca não Informada" && (
                    <p><strong>Marca/Modelo:</strong> {item.Marca} {item.Model}</p>
                  )}
                  {item['Detected At'] && (
                    <p><strong>Data/Hora:</strong> {new Date(item['Detected At']).toLocaleString('pt-BR')}</p>
                  )}
                  {item.CameraAddress && (
                    <p><strong>Localização:</strong> {item.CameraAddress}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Relatório gerado pelo sistema LPR</p>
      </footer>
    </div>
  );
};
