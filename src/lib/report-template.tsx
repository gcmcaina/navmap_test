
import React from 'react';
import type { PlateData } from '@/types';
import Image from "next/image";

interface ReportTemplateProps {
  data: PlateData[];
  title?: string;
}

// Este é o componente que define o layout do seu relatório em PDF.
// Você pode editar o estilo e a estrutura dele como desejar.
// Use classes do Tailwind CSS para estilizar. Lembre-se que nem todos os estilos
// CSS são totalmente suportados pelo html2canvas e jsPDF. Teste as alterações.

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ data, title = "Relatório de Veículos" }) => {
  return (
    <div id="report-content" className="p-8 bg-white text-black">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        <p className="text-sm text-gray-600">Total de veículos: {data.length}</p>
      </header>
      
      <main>
        <div className="grid grid-cols-1 gap-6">
          {data.map((item) => (
            <div key={item.id} className="p-4 border border-gray-300 rounded-lg flex items-start gap-4">
              <div className="flex-shrink-0 w-48 h-48 relative">
                 {/* A tag Image do Next.js não funciona bem aqui, usamos a tag <img> padrão */}
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={item['Image URL']} 
                  alt={item['License Plate'] || 'Veículo'} 
                  className="w-full h-full object-cover rounded-md"
                  crossOrigin="anonymous" // Importante para o html2canvas
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
