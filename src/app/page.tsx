
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import Image from "next/image";
import type { PlateData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input }from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Car,
  Bike,
  List,
  Search,
  Camera,
  Download,
  FileArchive,
  Clock,
  ChevronDown,
  Map,
  FileText,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Label } from "@/components/ui/label";
import { cameraAddressMapping } from "@/lib/camera-data";
import Link from "next/link";
import jsPDF from 'jspdf';
import dynamic from 'next/dynamic';


const VehicleMap = dynamic(() => import('@/components/map/vehicle-map'), { ssr: false });


export default function PlateGalleryPage() {
  const [data, setData] = useState<PlateData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlateData | null>(null);
  const [filter, setFilter] = useState<'all' | 'Carro' | 'Moto'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());


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
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {header: 1});

        if (jsonData.length < 2) {
          throw new Error("A planilha está vazia ou contém apenas o cabeçalho.");
        }

        const header: string[] = jsonData[0].map(h => String(h).trim().toLowerCase());
        const findHeaderIndex = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const index = header.indexOf(name);
            if (index > -1) {
              return index;
            }
          }
          return -1;
        }

        const imageUrlIndex = findHeaderIndex(["url da imagem", "image url"]);
        const licensePlateIndex = findHeaderIndex(["placa", "license plate"]);
        const detectedAtIndex = findHeaderIndex(["detectado em", "detected at"]);
        const bodyTypeIndex = findHeaderIndex(["carroceria", "body type"]);
        const marcaIndex = findHeaderIndex(["marca"]);
        const modelIndex = findHeaderIndex(["modelo", "model"]);
        const trustLevelIndex = findHeaderIndex(["confiança", "trust level", "f"]);
        const cameraIDIndex = findHeaderIndex(["id da câmera", "camera id", "c"]);


        if (imageUrlIndex === -1) {
            throw new Error("A coluna 'URL da imagem' não foi encontrada na planilha.");
        }
        
        const rows = jsonData.slice(1);
        const formattedData: PlateData[] = rows.map((row: any[], index) => {
          const trustLevel = trustLevelIndex > -1 && row[trustLevelIndex] ? parseFloat(row[trustLevelIndex]) : 100;
          const isTrusted = trustLevel >= 86;
          
          const cameraID = cameraIDIndex > -1 ? String(row[cameraIDIndex] || '') : undefined;
          const cameraAddress = cameraID ? cameraAddressMapping[cameraID] : undefined;

          let bodyType: 'Carro' | 'Moto' | undefined;
          let marca = "";
          let model = "";

          if (isTrusted) {
            const bodyTypeRaw = bodyTypeIndex > -1 ? String(row[bodyTypeIndex] || '').toLowerCase() : '';
            if (['automovel', 'carro'].includes(bodyTypeRaw)) {
              bodyType = 'Carro';
            } else if (['motocicleta', 'motoneta', 'moto'].includes(bodyTypeRaw)) {
              bodyType = 'Moto';
            }
            marca = marcaIndex > -1 && row[marcaIndex] ? String(row[marcaIndex]).trim() : "";
            model = modelIndex > -1 && row[modelIndex] ? String(row[modelIndex]).trim() : "";
          }
          
          return {
            id: `${file.name}-${index}`,
            "Image URL": row[imageUrlIndex],
            "License Plate": licensePlateIndex > -1 ? row[licensePlateIndex] : "N/A",
            "Detected At": detectedAtIndex > -1 ? row[detectedAtIndex] : undefined,
            "BodyType": bodyType,
            "Marca": marca || "Marca não Informada",
            "Model": model,
            "CameraID": cameraID,
            "CameraAddress": cameraAddress,
          }
        }).filter(item => item["Image URL"]);
        
        setData(formattedData);
        setFilter('all');
        setSearchQuery('');
        setIsHeaderOpen(false);
        toast({
          title: "Sucesso",
          description: `${formattedData.length} imagens carregadas com sucesso.`,
        });

      } catch (error: any) {
        console.error("Error parsing file:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Carregar Arquivo",
          description: error.message || "Não foi possível analisar o arquivo carregado.",
        });
        setData([]);
      } finally {
        setIsLoading(false);
        if (event.target) {
            event.target.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImageClick = (item: PlateData) => {
    setSelectedItem(item);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    e.preventDefault();
  
    const scaleAmount = 0.1;
    const newZoom = zoom - (e.deltaY > 0 ? scaleAmount : -scaleAmount);
    const clampedZoom = Math.max(0.5, Math.min(newZoom, 5));
  
    const image = imageRef.current;
    const rect = image.getBoundingClientRect();
  
    const mouseX = e.clientX;
    const mouseY = e.clientY;
  
    const imageX = mouseX - rect.left;
    const imageY = mouseY - rect.top;
  
    const pointX = (imageX - position.x) / zoom;
    const pointY = (imageY - position.y) / zoom;
  
    const newPosX = imageX - pointX * clampedZoom;
    const newPosY = imageY - pointY * clampedZoom;
  
    setZoom(clampedZoom);
    setPosition({ x: newPosX, y: newPosY });
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

  const handleDownloadAll = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    toast({
      title: "Preparando Download",
      description: "Iniciando o download de todas as imagens filtradas. Isso pode levar alguns instantes.",
    });

    const zip = new JSZip();
    const imagePromises = filteredData.map(async (item) => {
      try {
        const response = await fetch(item["Image URL"]);
        if (!response.ok) throw new Error(`Falha ao buscar imagem: ${item["Image URL"]}`);
        const blob = await response.blob();
        const filename = `${item["License Plate"] || 'sem-placa'}_${item.id}.jpg`;
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Não foi possível baixar a imagem ${item["Image URL"]}:`, error);
      }
    });

    await Promise.all(imagePromises);

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, "imagens_lpr.zip");
        toast({
          title: "Download Concluído",
          description: "O arquivo .zip com as imagens foi baixado.",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Erro no Download",
          description: "Ocorreu um erro ao criar o arquivo .zip.",
        });
        console.error("Erro ao gerar zip:", err);
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport || filteredData.length === 0) return;
    setIsGeneratingReport(true);
    toast({
      title: 'Gerando Relatório',
      description: 'Aguarde enquanto o relatório em PDF é preparado...',
    });

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentPage = 1;
      let itemsOnPage = 0;

      // Adiciona o cabeçalho na primeira página
      doc.setFontSize(18);
      doc.text("Relatório de Veículos", margin, margin);
      
      const headerText = `Gerado em: ${new Date().toLocaleString('pt-BR')} | Total: ${filteredData.length}`;
      doc.setFontSize(10);
      doc.text(headerText, pageWidth - margin, margin, { align: 'right' });

      for (let i = 0; i < filteredData.length; i++) {
        const item = filteredData[i];
        
        if (itemsOnPage === 3) {
          doc.addPage();
          currentPage++;
          itemsOnPage = 0;
        }
        
        const slotHeight = (pageHeight - (margin * 2)) / 3;
        let y = margin + (itemsOnPage * slotHeight);

        // Adiciona um espaço extra apenas para o primeiro item da primeira página
        if (currentPage === 1 && itemsOnPage === 0) {
            y += 15;
        }

        try {
          const response = await fetch(item['Image URL']);
          if (!response.ok) throw new Error('Falha ao buscar imagem.');
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const img = new (window as any).Image();
          img.src = dataUrl;
          await new Promise(resolve => { img.onload = resolve; });

          const imgMaxWidth = 80;
          const imgMaxHeight = slotHeight - 10; // Deixa uma pequena margem
          let imgWidth = img.width;
          let imgHeight = img.height;
          const aspectRatio = imgWidth / imgHeight;

          if (imgWidth > imgMaxWidth) {
            imgWidth = imgMaxWidth;
            imgHeight = imgWidth / aspectRatio;
          }
          if (imgHeight > imgMaxHeight) {
            imgHeight = imgMaxHeight;
            imgWidth = imgHeight * aspectRatio;
          }
          
          const imageX = margin;
          doc.addImage(dataUrl, 'JPEG', imageX, y, imgWidth, imgHeight);

          let textX = margin + imgWidth + 10;
          let textY = y + 5;

          doc.setFontSize(12).setFont("arial", 'bold');
          doc.text(item["License Plate"] || 'N/A', textX, textY);
          textY += 6;
          
          doc.setFontSize(10).setFont("arial", 'normal');
          if (item.Marca && item.Marca !== "Marca não Informada") {
              doc.text(`Veículo: ${item.Marca} ${item.Model || ''}`, textX, textY);
              textY += 5;
          }
          
          if (item['Detected At']) {
            doc.text(`Data/Hora: ${new Date(item['Detected At']).toLocaleString('pt-BR')}`, textX, textY);
            textY += 5;
          }
          if (item.CameraAddress) {
            const locationLines = doc.splitTextToSize(`Localização: ${item.CameraAddress}`, pageWidth - textX - margin);
            doc.text(locationLines, textX, textY);
          }
        } catch (e) {
          console.error(`Falha ao carregar imagem para o relatório: ${item['Image URL']}`, e);
          let textX = margin + 90;
          doc.text('Imagem indisponível', margin, y + 25);
          doc.setFontSize(12).setFont("arial", 'bold');
          doc.text(item["License Plate"] || 'N/A', textX, y + 5);
        }
        itemsOnPage++;
      }
  
      doc.save('relatorio_lpr.pdf');
  
      toast({
        title: 'Relatório Gerado',
        description: 'O seu relatório em PDF foi baixado.',
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Gerar Relatório",
        description: "Não foi possível gerar o PDF. Verifique o console para mais detalhes.",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };


  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (imageErrors[item.id]) return false;
      
      const typeFilterMatch = filter === 'all' || item.BodyType === filter;
      
      const normalizedSearch = searchQuery.toLowerCase();
      const searchFilterMatch = !searchQuery || 
        (item.Marca && item.Marca.toLowerCase().includes(normalizedSearch)) ||
        (item.Model && item.Model.toLowerCase().includes(normalizedSearch)) ||
        (item["License Plate"] && item["License Plate"].toLowerCase().includes(normalizedSearch));

      let timeFilterMatch = true;
      if (item["Detected At"] && (startTime || endTime)) {
        const detectedAt = String(item["Detected At"]);
        const timePart = detectedAt.split(' ')[1];
        if (!timePart) return false;

        const [hours, minutes] = timePart.split(':').map(Number);
        const itemTime = hours * 60 + minutes;

        let startMinutes: number | null = null;
        if (startTime) {
          const [startHours, startMinutesVal] = startTime.split(':').map(Number);
          startMinutes = startHours * 60 + startMinutesVal;
        }

        let endMinutes: number | null = null;
        if (endTime) {
          const [endHours, endMinutesVal] = endTime.split(':').map(Number);
          endMinutes = endHours * 60 + endMinutesVal;
        }

        if (startMinutes !== null && endMinutes !== null) {
          if (startMinutes <= endMinutes) {
            timeFilterMatch = itemTime >= startMinutes && itemTime <= endMinutes;
          } else { 
            timeFilterMatch = itemTime >= startMinutes || itemTime <= endMinutes;
          }
        } else if (startMinutes !== null) {
          timeFilterMatch = itemTime >= startMinutes;
        } else if (endMinutes !== null) {
          timeFilterMatch = itemTime <= endMinutes;
        }
      }

      return typeFilterMatch && searchFilterMatch && timeFilterMatch;
    });
  }, [data, filter, searchQuery, imageErrors, startTime, endTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;

      const currentIndex = filteredData.findIndex(item => item.id === selectedItem.id);
      if (currentIndex === -1) return;

      let nextIndex;
      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % filteredData.length;
        setSelectedItem(filteredData[nextIndex]);
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + filteredData.length) % filteredData.length;
        setSelectedItem(filteredData[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem, filteredData]);
  
  const renderGrid = () => (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {filteredData.map((item) => (
          <Card
            key={item.id}
            className="overflow-hidden group transition-all duration-300 hover:shadow-xl cursor-pointer"
            onClick={() => handleImageClick(item)}
          >
            <div className="relative w-full aspect-square bg-muted">
              <Image
                src={item["Image URL"]}
                alt={item["License Plate"] || 'Imagem do Veículo'}
                fill
                objectFit="cover"
                className="group-hover:opacity-90 transition-opacity"
                unoptimized
                onError={() => handleImageError(item.id)}
              />
            </div>
            <div className="p-3 bg-card text-center">
              <p className="font-bold text-lg truncate">{item["License Plate"]}</p>
              <p className="text-sm text-muted-foreground">
                {item.Marca !== "Marca não Informada" ? `${item.Marca} ${item.Model}` : "Marca não Informada"}
              </p>
              {item.CameraAddress && item.CameraID && (
                <Link href={`https://smartsampa.sentinelx.com.br/cameras/cameras/details/${item.CameraID}`} target="_blank" className="text-xs text-muted-foreground truncate hover:underline">
                  {item.CameraAddress}
                </Link>
              )}
              {item["Detected At"] && <p className="text-sm text-muted-foreground">{new Date(item["Detected At"]).toLocaleString()}</p>}
            </div>
          </Card>
        )
      )}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Collapsible
          open={isHeaderOpen}
          onOpenChange={setIsHeaderOpen}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-2">
            <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                    <h1 className="text-4xl font-bold text-primary">LPR</h1>
                    <ChevronDown className={`transition-transform duration-300 ${isHeaderOpen ? "" : "-rotate-90"}`} />
                    <span className="sr-only">Toggle Header</span>
                </div>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
             <div className="text-center">
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                    Faça o upload de uma planilha para exibir as imagens a partir de qualquer URL encontrada no arquivo.
                </p>
                <Card className="max-w-lg mx-auto mt-4 mb-8">
                <CardHeader>
                    <CardTitle>Anexe o Arquivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex-grow">
                    <label className="text-sm font-medium mb-2 block sr-only">Carregar Arquivo</label>
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
                            {isLoading ? 'Processando...' : 'Selecione um arquivo CSV ou XLSX'}
                        </label>
                        </Button>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>


        {data.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
            <div className="relative w-full max-w-xs">
              <Input 
                placeholder="Pesquisar por placa, marca ou modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
                <List className="mr-2 h-4 w-4" />
                Todos
              </Button>
              <Button variant={filter === 'Carro' ? 'default' : 'outline'} onClick={() => setFilter('Carro')}>
                 <Car className="mr-2 h-4 w-4" />
                Carros
              </Button>
              <Button variant={filter === 'Moto' ? 'default' : 'outline'} onClick={() => setFilter('Moto')}>
                <Bike className="mr-2 h-4 w-4" />
                Motos
              </Button>
            </div>
            <div className="flex gap-4 items-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="grid gap-1">
                <Label htmlFor="start-time" className="text-xs">Início</Label>
                <Input 
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="end-time" className="text-xs">Fim</Label>
                <Input 
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
             <Button onClick={handleDownloadAll} disabled={isDownloading || filteredData.length === 0}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                {isDownloading ? 'Baixando...' : `Baixar ${filteredData.length} Imagens`}
              </Button>
              <Button onClick={handleGenerateReport} disabled={isGeneratingReport || filteredData.length === 0}>
                {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {isGeneratingReport ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              <Button onClick={() => {
                setMapKey(Date.now());
                setIsMapOpen(true);
                }} 
                disabled={filteredData.length === 0}
                >
                <Map className="mr-2 h-4 w-4" />
                Ver no Mapa
              </Button>
          </div>
        )}

        <main className="mt-8">
          {isLoading && (
            <div className="flex justify-center items-center h-64 flex-col">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Processando seu arquivo...</p>
            </div>
          )}
          {!isLoading && data.length === 0 && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Nenhuma Imagem para Exibir</h3>
                <p className="text-muted-foreground mt-2">Faça o upload de um arquivo para começar.</p>
             </Card>
          )}
          {!isLoading && filteredData.length > 0 && renderGrid()}
          {!isLoading && data.length > 0 && filteredData.length === 0 && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Nenhuma imagem para este filtro</h3>
                <p className="text-muted-foreground mt-2">Selecione outro filtro ou carregue um novo arquivo.</p>
             </Card>
          )}
          {!isLoading && data.length > 0 && data.every(item => imageErrors[item.id]) && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Nenhuma imagem válida encontrada</h3>
                <p className="text-muted-foreground mt-2">Verifique as URLs das imagens em seu arquivo.</p>
             </Card>
          )}
        </main>
      </div>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-7xl w-full h-[95vh] p-2 flex flex-col">
            <DialogHeader>
                <DialogTitle>Mapa de Câmeras</DialogTitle>
                <DialogDescription>
                    Visualização das câmeras no mapa. Use o zoom para agrupar ou desagrupar os marcadores.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow rounded-md overflow-hidden">
              {isMapOpen && <VehicleMap key={mapKey} data={filteredData} />}
            </div>
        </DialogContent>
      </Dialog>


      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-7xl w-full h-[95vh] p-2 flex flex-col"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <DialogHeader className="p-4">
             <DialogTitle className="sr-only">Imagem Ampliada</DialogTitle>
             <DialogDescription className="sr-only">Visualize e interaja com a imagem selecionada.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <>
            <div
              className="relative w-full flex-grow flex items-center justify-center overflow-hidden rounded-md"
              style={{ cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'default') }}
            >
                <Image
                    ref={imageRef}
                    src={selectedItem["Image URL"]}
                    alt="Imagem selecionada"
                    width={1000}
                    height={1000}
                    className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                      transformOrigin: 'top left',
                    }}
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/800x800.png'
                      e.currentTarget.dataset.aiHint = "broken image";
                      if (selectedItem) {
                        setSelectedItem({...selectedItem, "Image URL": 'https://placehold.co/800x800.png' });
                      }
                    }}
                />
            </div>
             <div className="absolute bottom-4 right-4 flex gap-2 bg-background/70 p-2 rounded-lg">
                <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(0.5, z-0.2))}>
                  <ZoomOut />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(5, z+0.2))}>
                  <ZoomIn />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleResetZoom}>
                  <RotateCcw />
                </Button>
                <Button variant="secondary" size="icon" asChild>
                  <a href={selectedItem["Image URL"]} download={`${selectedItem["License Plate"] || 'imagem'}.jpg`} target="_blank">
                    <Download />
                  </a>
                </Button>
            </div>
             <div className="flex-shrink-0 p-4 bg-muted/50 rounded-b-lg mt-2">
                <h3 className="text-xl font-bold">{selectedItem["License Plate"]}</h3>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                   {selectedItem.Marca && selectedItem.Marca !== 'Marca não Informada' && (
                     <p><span className="font-semibold">Marca:</span> {selectedItem.Marca}</p>
                   )}
                   {selectedItem.Marca && selectedItem.Marca !== 'Marca não Informada' && selectedItem.Model && (
                     <p><span className="font-semibold">Modelo:</span> {selectedItem.Model}</p>
                   )}
                   {selectedItem["Detected At"] && (
                      <p><span className="font-semibold">Detectado em:</span> {new Date(selectedItem["Detected At"]).toLocaleString()}</p>
                   )}
                   {selectedItem.CameraAddress && selectedItem.CameraID && (
                     <p><span className="font-semibold">Local:</span>{' '}
                       <Link href={`https://smartsampa.sentinelx.com.br/cameras/cameras/details/${selectedItem.CameraID}`} target="_blank" className="hover:underline">
                         {selectedItem.CameraAddress}
                       </Link>
                     </p>
                   )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

