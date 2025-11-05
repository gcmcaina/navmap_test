
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PlateData } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin } from 'lucide-react';

interface TimelineSidebarProps {
  data: PlateData[];
  onItemClick: (item: PlateData) => void;
}

export function TimelineSidebar({ data, onItemClick }: TimelineSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<PlateData | null>(null);

  const handleMouseEnter = (item: PlateData) => {
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <aside className="relative w-64 hidden lg:block">
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
        <div className="relative flex flex-col items-start">
          {/* Linha vertical da timeline */}
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border -z-10" />

          {data.map((item, index) => {
             const detectedDate = item['Detected At'] ? new Date(item['Detected At']) : null;
             
             return (
                <div
                key={item.id}
                className="relative w-full my-4 flex items-center"
                onMouseEnter={() => handleMouseEnter(item)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onItemClick(item)}
                >
                    <div className="absolute left-2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background cursor-pointer hover:scale-125 transition-transform" />
                    {detectedDate && (
                        <div className="ml-8 text-xs text-muted-foreground cursor-pointer">
                            <p>{format(detectedDate, 'dd/MM/yy', { locale: ptBR })}</p>
                        </div>
                    )}
                </div>
             )
          })}
        </div>
      </ScrollArea>
      
      {hoveredItem && (
        <Card className="absolute right-full top-1/2 -translate-y-1/2 mr-4 w-64 shadow-2xl z-20 pointer-events-none">
          <CardContent className="p-2">
            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
              <Image
                src={hoveredItem['Image URL']}
                alt={hoveredItem['License Plate'] || 'Preview'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            </div>
            <div className="p-2 space-y-1">
              <p className="font-bold text-lg">{hoveredItem['License Plate']}</p>
              <p className="text-sm text-muted-foreground">
                {hoveredItem.Marca !== "Marca não Informada" ? `${hoveredItem.Marca} ${hoveredItem.Model}` : 'Veículo não identificado'}
              </p>
               {hoveredItem['Detected At'] && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(hoveredItem['Detected At']).toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {hoveredItem.CameraAddress && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{hoveredItem.CameraAddress}</span>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
