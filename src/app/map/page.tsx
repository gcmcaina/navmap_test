'use client';

import dynamic from 'next/dynamic';
import { cameraData } from '@/lib/camera-data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Dynamically import the Map component outside of the component render
const Map = dynamic(() => import('@/components/map'), {
  loading: () => <p>A map is loading</p>,
  ssr: false,
});

const MapPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
       <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Mapa de Câmeras</h1>
        </div>
      </header>
      <main className="flex-grow">
        <Card className="w-full h-[calc(100vh-81px)] border-0 rounded-none">
          <Map cameras={cameraData} />
        </Card>
      </main>
    </div>
  );
};

export default MapPage;
