
"use client";

import { useState, useRef, MouseEvent, useEffect } from "react";
import * as XLSX from "xlsx";
import Image from "next/image";
import type { PlateData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";


export default function PlateGalleryPage() {
  const [data, setData] = useState<PlateData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImageErrors({});
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("The spreadsheet is empty.");
        }

        // Find header mapping
        const header = Object.keys(jsonData[0]);
        const imageUrlKey = header.find(h => h.trim().toLowerCase() === "url da imagem");
        const licensePlateKey = header.find(h => h.trim().toLowerCase() === "placa");
        const detectedAtKey = header.find(h => h.trim().toLowerCase() === "detectado em");

        if (!imageUrlKey) {
            throw new Error("Column 'URL da imagem' not found in the spreadsheet.");
        }

        const formattedData: PlateData[] = jsonData.map((row, index) => ({
          id: `${file.name}-${index}`,
          "Image URL": row[imageUrlKey],
          "License Plate": licensePlateKey ? row[licensePlateKey] : "N/A",
          "Detected At": detectedAtKey ? row[detectedAtKey] : undefined,
        })).filter(item => item["Image URL"]);
        
        setData(formattedData);
        toast({
          title: "Success",
          description: `${formattedData.length} images loaded successfully.`,
        });

      } catch (error: any) {
        console.error("Error parsing file:", error);
        toast({
          variant: "destructive",
          title: "File Upload Error",
          description: error.message || "Could not parse the uploaded file.",
        });
        setData([]);
      } finally {
        setIsLoading(false);
        event.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    e.preventDefault();

    const scaleAmount = 0.1;
    const newZoom = zoom - (e.deltaY > 0 ? scaleAmount : -scaleAmount);
    setZoom(Math.max(0.5, Math.min(newZoom, 5))); // Clamp zoom level
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsPanning(true);
      startPosRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && imageRef.current) {
      e.preventDefault();
      const newX = e.clientX - startPosRef.current.x;
      const newY = e.clientY - startPosRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({...prev, [id]: true}));
  }
  
  const renderGrid = () => (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {data.map((item) => {
        if(imageErrors[item.id]) return null;

        return (
          <Card
            key={item.id}
            className="overflow-hidden group transition-all duration-300 hover:shadow-xl cursor-pointer"
            onClick={() => handleImageClick(item["Image URL"])}
          >
            <div className="relative w-full aspect-square bg-muted">
              <Image
                src={item["Image URL"]}
                alt={item["License Plate"] || 'Vehicle Image'}
                layout="fill"
                objectFit="cover"
                className="group-hover:opacity-90 transition-opacity"
                unoptimized
                onError={() => handleImageError(item.id)}
              />
            </div>
            <div className="p-3 bg-card text-center">
              <p className="font-bold text-lg truncate">{item["License Plate"]}</p>
              {item["Detected At"] && <p className="text-sm text-muted-foreground">{new Date(item["Detected At"]).toLocaleString()}</p>}
            </div>
          </Card>
        )
      })}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary">Image Viewer</h1>
          <p className="text-muted-foreground mt-2">
            Upload a spreadsheet to display images from any URL found in the file.
          </p>
        </header>

        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Upload Spreadsheet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex-grow">
              <label className="text-sm font-medium mb-2 block sr-only">Upload File</label>
              <div className="relative">
                <Input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
                 <Button asChild variant="outline" className="w-full justify-center text-left font-normal" disabled={isLoading}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Processing...' : 'Select a CSV or XLSX file'}
                  </label>
                 </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <main className="mt-8">
          {isLoading && (
            <div className="flex justify-center items-center h-64 flex-col">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Processing your file...</p>
            </div>
          )}
          {!isLoading && data.length === 0 && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Images to Display</h3>
                <p className="text-muted-foreground mt-2">Upload a file to get started.</p>
             </Card>
          )}
          {!isLoading && data.filter(item => !imageErrors[item.id]).length > 0 && renderGrid()}
          {!isLoading && data.length > 0 && data.every(item => imageErrors[item.id]) && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No valid images found</h3>
                <p className="text-muted-foreground mt-2">Check the image URLs in your file.</p>
             </Card>
          )}
        </main>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-transparent border-0 flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {selectedImage && (
            <>
            <div
              ref={imageRef}
              className="relative w-full h-full flex items-center justify-center"
              style={{ cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'default') }}
            >
                <Image
                    src={selectedImage}
                    alt="Selected image"
                    width={1000}
                    height={1000}
                    className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                      transformOrigin: 'center center',
                    }}
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/800x800.png'
                      e.currentTarget.dataset.aiHint = "broken image";
                      setSelectedImage('https://placehold.co/800x800.png');
                    }}
                />
            </div>
             <div className="absolute bottom-4 right-4 flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(0.5, z-0.2))}>
                  <ZoomOut />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(5, z+0.2))}>
                  <ZoomIn />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleResetZoom}>
                  <RotateCcw />
                </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

