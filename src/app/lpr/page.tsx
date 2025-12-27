
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import Image from "next/image";
import type { PlateData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Map as MapIcon,
  FileText,
  ImageIcon,
  ImageOff,
  FilterX,
  PanelLeft,
  Truck,
  Sun,
  Moon,
  Palette,
  CalendarIcon,
  LogOut,
  MapPin,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import jsPDF from 'jspdf';
import dynamic from 'next/dynamic';
import { logoBase64 } from "@/lib/logo-base64";
import { pdfLayoutConfig } from "@/lib/pdf-layout";
import { cameraCoordinates } from '@/lib/camera-coordinates';
import { TimelineSidebar } from "@/components/timeline/timeline-sidebar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/use-auth";
import { mercosulPlateBase64 } from "@/lib/mercosul-base64";
import { feFontBase64 } from "@/lib/fe-font-base64";


const VehicleMap = dynamic(() => import('@/components/map/vehicle-map'), { ssr: false });


export default function LPRPage() {
  const [data, setData] = useState<PlateData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlateData | null>(null);
  const [filter, setFilter] = useState<'all' | 'Carro' | 'Moto' | 'Caminhão'>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [filterDate, setFilterDate] = useState<DateRange | undefined>(undefined);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());
  const [reportFilename, setReportFilename] = useState("relatorio_lpr");
  const [polygonFilteredData, setPolygonFilteredData] = useState<PlateData[] | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const { logout } = useAuth();


  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const processData = (jsonData: any[], fileName: string): PlateData[] => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error("O arquivo está vazio ou em um formato não suportado.");
    }
  
    const getField = (item: any, possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (item[key] !== undefined && item[key] !== null) return item[key];
      }
      const lowerCaseKeys = possibleKeys.map(k => k.toLowerCase());
      for (const itemKey in item) {
        if (lowerCaseKeys.includes(itemKey.toLowerCase())) return item[itemKey];
      }
      return null;
    };
  
    const firstItemKeys = Object.keys(jsonData[0] || {});
    const headerWithUrl = firstItemKeys.find(key => key.toLowerCase().includes('url'));
  
    let processed = jsonData.map((item, index) => {
      let imageUrl = getField(item, ["URL da imagem", "Image URL"]);
      if (!imageUrl && headerWithUrl) {
          imageUrl = item[headerWithUrl];
      } else if (!imageUrl && firstItemKeys.length > 0) {
          imageUrl = item[firstItemKeys[0]];
      }
  
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) return null;
  
      const trustLevel = getField(item, ["Confiança", "Trust Level", "F"]);
      const isTrusted = trustLevel ? parseFloat(trustLevel) >= 86 : true;
  
      const cameraID = getField(item, ["ID da Câmera", "Camera ID", "C", "D"]);
      let bodyType: 'Carro' | 'Moto' | 'Caminhão' | undefined;
      let marca: string | undefined;
      let model: string | undefined;
      let cor: string | undefined;
  
      if (isTrusted) {
        const bodyTypeRaw = String(getField(item, ["Carroceria", "Body Type"]) || '').toLowerCase();
        if (['automovel', 'carro'].includes(bodyTypeRaw)) bodyType = 'Carro';
        else if (['motocicleta', 'motoneta', 'moto'].includes(bodyTypeRaw)) bodyType = 'Moto';
        else if (['caminhão', 'caminhao'].includes(bodyTypeRaw)) bodyType = 'Caminhão';
        marca = getField(item, ["Marca"]);
        model = getField(item, ["Modelo", "Model"]);
        cor = getField(item, ["Cor", "Color"]);
      }
  
      const coords = cameraID ? cameraCoordinates.find(c => c.id === cameraID) : undefined;
  
      return {
        id: `${fileName}-${index}`,
        "Image URL": imageUrl,
        "License Plate": getField(item, ["Placa", "License Plate"]),
        "Detected At": getField(item, ["Detectado Em", "Detected At"]),
        "BodyType": bodyType,
        "Cor": cor,
        "Marca": marca,
        "Model": model,
        "CameraID": cameraID,
        "CameraTitle": getField(item, ["Título da Câmera", "Camera Title", "E"]),
        "CameraAddress": getField(item, ["Endereço da Câmera", "Camera Address"]),
        "lat": coords?.lat,
        "lng": coords?.lng,
      };
    }).filter((item): item is PlateData => item !== null && !!item["Image URL"]);
  
    // Second pass to fill in missing data
    const plateDataMap = new Map<string, { Marca?: string; Model?: string }>();
  
    // First, find the best data for each plate
    processed.forEach(item => {
      const plate = item['License Plate'];
      if (plate) {
        if (!plateDataMap.has(plate) || (!plateDataMap.get(plate)?.Marca && item.Marca)) {
          plateDataMap.set(plate, { Marca: item.Marca, Model: item.Model });
        }
      }
    });
  
    // Then, apply the found data to items with missing info
    processed = processed.map(item => {
      const plate = item['License Plate'];
      if (plate && (!item.Marca || !item.Model)) {
        const knownData = plateDataMap.get(plate);
        if (knownData) {
          return {
            ...item,
            Marca: item.Marca || knownData.Marca,
            Model: item.Model || knownData.Model,
          };
        }
      }
      return item;
    });
  
    return processed;
  };
  

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImageErrors({});
    setPolygonFilteredData(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result;
        let jsonData: any[] = [];
        const fileName = file.name;

        if (file.type === 'application/json') {
          jsonData = JSON.parse(fileContent as string);
        } else {
          const workbook = XLSX.read(fileContent, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, 
            defval: null
          });
        }
        
        const formattedData = processData(jsonData, fileName);
        
        setData(formattedData);
        setFilter('all');
        setColorFilter('all');
        setSearchQuery('');
        setIsHeaderOpen(false);
        toast({
          title: "Sucesso",
          description: `${formattedData.length} itens carregados com sucesso.`,
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
    
    if (file.type === 'application/json') {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
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
    const imagePromises = availableData.map(async (item) => {
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
    if (isGeneratingReport || sortedData.length === 0) return;
    setIsGeneratingReport(true);
    toast({
      title: 'Gerando Relatório',
      description: 'Aguarde enquanto o relatório em PDF é preparado...',
    });
  
    const localImageErrors: Record<string, boolean> = {};
    const reportData = [...sortedData];
    const reportAvailableData: PlateData[] = [];
    const reportUnavailableData: PlateData[] = [];
  
    // Fetch all images and categorize them
    const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    await Promise.all(reportData.map(async (item) => {
      try {
        const imageUrl = `${corsProxy}${item['Image URL']}`;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        item.preloadedImageUrl = dataUrl;
        reportAvailableData.push(item);
      } catch (e) {
        reportUnavailableData.push(item);
        localImageErrors[item.id] = true;
      }
    }));
  
    // Sort again as async operations might mess up the order
    reportAvailableData.sort((a, b) => new Date(b["Detected At"] || 0).getTime() - new Date(a["Detected At"] || 0).getTime());
    reportUnavailableData.sort((a, b) => new Date(b["Detected At"] || 0).getTime() - new Date(a["Detected At"] || 0).getTime());
  
    try {
      const doc = new jsPDF({
        orientation: pdfLayoutConfig.orientation,
        unit: pdfLayoutConfig.unit,
        format: pdfLayoutConfig.format,
      });
  
      const {
        margin,
        pageWidth,
        pageHeight,
        font,
        titleSize,
        headerSize,
        bodySize,
        smallSize,
        lineHeight,
        image,
      } = pdfLayoutConfig;
      let yPosition = margin;
  
      const addBackground = () => {
        if (logoBase64 && !logoBase64.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')) {
          const logoWidth = image.width;
          const logoHeight = image.height;
          const x = (pageWidth - logoWidth) / 2;
          const y = (pageHeight - logoHeight) / 2;
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: image.opacity }));
          doc.addImage(logoBase64, 'PNG', x, y, logoWidth, logoHeight, undefined, 'FAST');
          doc.restoreGraphicsState();
        }
      }
  
      const addHeader = () => {
        yPosition = margin;
        doc.setFontSize(titleSize);
        doc.setFont(font.name, 'bold');
        doc.text("Relatório de Veículos", margin, yPosition);
  
        doc.setFontSize(headerSize);
        doc.setFont(font.name, 'normal');
        const headerText = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        doc.text(headerText, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 20;
      }
      
      const checkNewPage = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          doc.addPage();
          addBackground();
          yPosition = margin;
        }
      };
  
      const addTextInfo = (item: PlateData, x: number, y: number) => {
        let textY = y;
        doc.setFontSize(bodySize).setFont(font.name, 'bold');
        doc.text(item["License Plate"] || 'N/A', x, textY);
        textY += lineHeight.large;
        
        doc.setFont(font.name, 'normal');
        doc.setFontSize(smallSize);
        if (item.Marca && item.Marca !== "Marca não Informada") {
            doc.text(`Veículo: ${item.Marca} ${item.Model || ''}`, x, textY);
            textY += lineHeight.small;
        }
        
        if (item['Detected At']) {
          doc.text(`Data/Hora: ${new Date(item['Detected At']).toLocaleString('pt-BR')}`, x, textY);
          textY += lineHeight.small;
        }
        if (item.CameraAddress) {
          const locationLines = doc.splitTextToSize(`Localização: ${item.CameraAddress}`, pageWidth - x - margin);
          doc.text(locationLines, x, textY);
          textY += (locationLines.length * lineHeight.small);
        }
        return textY;
      }
      
      addBackground();
      addHeader();
  
      // Special layout for a single plate
      if (reportAvailableData.length === 1 && reportUnavailableData.length === 0) {
        const item = reportAvailableData[0];
        const plate = item["License Plate"] || "N/A";
  
        // Add Mercosul Plate background
        if (mercosulPlateBase64.length > 100) { // Check if it's not the placeholder
          const plateImgWidth = 100;
          const plateImgHeight = 30;
          const plateX = (pageWidth - plateImgWidth) / 2;
          doc.addImage(mercosulPlateBase64, 'PNG', plateX, yPosition, plateImgWidth, plateImgHeight);
          yPosition += plateImgHeight;
  
          // Add custom font and plate text
          if (feFontBase64) {
            doc.addFileToVFS('fe-font.ttf', feFontBase64);
            doc.addFont('fe-font.ttf', 'FE-Font', 'normal');
            doc.setFont('FE-Font');
          } else {
             doc.setFont('Courier', 'bold');
          }
          doc.setFontSize(28);
          doc.setTextColor(0, 0, 0);
          doc.text(plate, pageWidth / 2, yPosition - 13, { align: 'center' });
        }
        
        yPosition += 10;
        doc.setFont(font.name, 'normal');
        checkNewPage(110);
  
        // Add vehicle image
        try {
          if (!item.preloadedImageUrl) throw new Error('Imagem pré-carregada não encontrada.');
          
          const img = new (window as any).Image();
          img.src = item.preloadedImageUrl;
          await new Promise(resolve => { img.onload = resolve; });
  
          const imgMaxHeight = 100;
          const aspectRatio = img.width / img.height;
          const imgWidth = imgMaxHeight * aspectRatio;
          const imgX = (pageWidth - imgWidth) / 2;
          
          doc.addImage(item.preloadedImageUrl, 'JPEG', imgX, yPosition, imgWidth, imgMaxHeight);
          yPosition += imgMaxHeight + 10;
        } catch (e) {
          console.error(`Falha ao carregar imagem para o relatório: ${item['Image URL']}`, e);
          doc.setFontSize(smallSize).setFont(font.name, 'italic');
          doc.text('Imagem indisponível', pageWidth / 2, yPosition + 50, {align: 'center'});
          yPosition += 110;
        }
  
        // Add text info below the image
        checkNewPage(50);
        addTextInfo(item, margin, yPosition);
  
      } else { // Default layout for multiple plates
        for (let i = 0; i < reportAvailableData.length; i++) {
          const item = reportAvailableData[i];
          const itemHeight = 75;
          checkNewPage(itemHeight);
  
          const textX = margin + 90;
  
          try {
            if (!item.preloadedImageUrl) throw new Error('Imagem pré-carregada não encontrada.');

            const img = new (window as any).Image();
            img.src = item.preloadedImageUrl;
            await new Promise(resolve => { img.onload = resolve; });
  
            const imgMaxWidth = 80;
            const imgMaxHeight = 60;
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
            
            doc.addImage(item.preloadedImageUrl, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            
          } catch (e) {
            console.error(`Falha ao carregar imagem para o relatório: ${item['Image URL']}`, e);
            doc.setFontSize(smallSize).setFont(font.name, 'italic');
            doc.text('Imagem indisponível', margin, yPosition + 30);
          } finally {
            let textY = addTextInfo(item, textX, yPosition + 5);
            doc.setTextColor(pdfLayoutConfig.linkColor.r, pdfLayoutConfig.linkColor.g, pdfLayoutConfig.linkColor.b);
            doc.textWithLink('Ver Imagem', textX, textY, { url: item['Image URL'] });
            doc.setTextColor(0, 0, 0);
          }
        
          yPosition += itemHeight;
          if(i < reportAvailableData.length -1) {
            checkNewPage(2);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
          }
        }
      }
  
      if (reportUnavailableData.length > 0 && reportAvailableData.length !== 1) {
        checkNewPage(20);
        yPosition += 10;
        doc.setFontSize(headerSize).setFont(font.name, 'bold');
        doc.text(`Imagens Indisponíveis (${reportUnavailableData.length})`, margin, yPosition);
        yPosition += lineHeight.large;
        
        const groupedByPlate = reportUnavailableData.reduce((acc, item) => {
          const plate = item["License Plate"] || "Sem Placa";
          if (!acc[plate]) {
            acc[plate] = [];
          }
          acc[plate].push(item);
          return acc;
        }, {} as Record<string, PlateData[]>);
  
        for (const plate in groupedByPlate) {
          checkNewPage(10);
          doc.setFontSize(bodySize).setFont(font.name, 'bold');
          doc.text(plate, margin, yPosition);
          yPosition += lineHeight.medium;
  
          const items = groupedByPlate[plate];
  
          for (const item of items) {
             checkNewPage(5);
             doc.setFontSize(smallSize).setFont(font.name, 'normal');
             const date = item["Detected At"] ? new Date(item["Detected At"]).toLocaleString('pt-BR') : 'Data desconhecida';
             const address = item.CameraAddress || 'Endereço desconhecido';
             const text = `${date} - ${address}`;
             const textLines = doc.splitTextToSize(text, pageWidth - margin - margin - 5);
             doc.text(textLines, margin + 5, yPosition);
             yPosition += textLines.length * lineHeight.small;
          }
          yPosition += lineHeight.small;
        }
      }
  
      const finalFilename = reportFilename.trim() ? `${reportFilename.trim()}.pdf` : 'relatorio_lpr.pdf';
      doc.save(finalFilename);
  
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


  const currentData = useMemo(() => {
    return polygonFilteredData || data;
  }, [data, polygonFilteredData]);

  const availableColors = useMemo(() => {
    const colors = new Set(data.map(item => item.Cor).filter(Boolean));
    return ['all', ...Array.from(colors)];
  }, [data]);

  const filteredData = useMemo(() => {
    return currentData.filter(item => {
      const typeFilterMatch = filter === 'all' || item.BodyType === filter;
      const colorFilterMatch = colorFilter === 'all' || item.Cor === colorFilter;
      
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

      let dateFilterMatch = true;
      if (filterDate && item["Detected At"]) {
        const itemDate = new Date(item["Detected At"]);
        if (filterDate.from && filterDate.to) {
          dateFilterMatch = itemDate >= filterDate.from && itemDate <= filterDate.to;
        } else if (filterDate.from) {
          dateFilterMatch =
            itemDate.getDate() === filterDate.from.getDate() &&
            itemDate.getMonth() === filterDate.from.getMonth() &&
            itemDate.getFullYear() === filterDate.from.getFullYear();
        }
      }

      return typeFilterMatch && searchFilterMatch && timeFilterMatch && colorFilterMatch && dateFilterMatch;
    });
  }, [currentData, filter, searchQuery, startTime, endTime, colorFilter, filterDate]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => 
      new Date(b["Detected At"] || 0).getTime() - new Date(a["Detected At"] || 0).getTime()
    );
  }, [filteredData]);


  const availableData = useMemo(() => sortedData.filter(item => !imageErrors[item.id]), [sortedData, imageErrors]);
  const unavailableData = useMemo(() => sortedData.filter(item => imageErrors[item.id]), [sortedData, imageErrors]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;

      const currentIndex = availableData.findIndex(item => item.id === selectedItem.id);
      if (currentIndex === -1) return;

      let nextIndex;
      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % availableData.length;
        setSelectedItem(availableData[nextIndex]);
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + availableData.length) % availableData.length;
        setSelectedItem(availableData[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem, availableData]);
  
  const renderGrid = (items: PlateData[], isUnavailable = false) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 transition-all duration-300 ${hoveredDate ? 'blur-sm brightness-50' : ''}`}>
      {items.map((item) => {
        const itemDate = item['Detected At'] ? new Date(item['Detected At']).toLocaleDateString('pt-BR') : null;
        const isHovered = hoveredDate && itemDate === hoveredDate;

        const hasInfo = item["License Plate"] || item.Marca || item.CameraTitle || item["Detected At"];

        return (
          <Card
            key={item.id}
            className={`overflow-hidden group transition-all duration-300 ${!isUnavailable ? 'hover:shadow-xl' : 'bg-muted/50'} ${isHovered ? '!blur-none !brightness-100' : ''}`}
            
          >
            <div className="relative w-full aspect-square bg-muted" onClick={() => !isUnavailable && handleImageClick(item)}>
              {isUnavailable ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <ImageOff className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Imagem Indisponível</p>
                </div>
              ) : (
                <Image
                  src={item["Image URL"]}
                  alt={item["License Plate"] || 'Imagem do Veículo'}
                  fill
                  style={{ objectFit: "cover" }}
                  className="group-hover:opacity-90 transition-opacity cursor-pointer"
                  unoptimized
                  onError={() => handleImageError(item.id)}
                />
              )}
            </div>
            {hasInfo && (
              <div className="p-3 bg-card text-left space-y-1.5">
                {item["License Plate"] && (
                    <h3 className="font-bold text-lg truncate">{item["License Plate"]}</h3>
                )}
                {(item.Marca || item.Model) && (
                   <p className="text-sm text-muted-foreground truncate">
                    {`${item.Marca || ''} ${item.Model || ''}`}
                  </p>
                )}
                {item.CameraTitle && item.CameraID && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <MapPin className="w-3 h-3" />
                    <Link href={`https://smartsampa.sentinelx.com.br/cameras/map/${item.CameraID}`} target="_blank" className="hover:underline">
                      {item.CameraTitle}
                    </Link>
                  </div>
                )}
                {item["Detected At"] && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                     <Clock className="w-3.5 h-3.5" />
                     <p>{new Date(item["Detected At"]).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @font-face {
          font-family: 'FE-Font';
          src: url('data:font/ttf;base64,${feFontBase64}') format('truetype');
        }
      `}</style>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Collapsible
          open={isHeaderOpen}
          onOpenChange={setIsHeaderOpen}
          className="w-full mb-6"
        >
          <div className="flex justify-between items-center">
            <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer group">
                    <h1 className="text-4xl font-bold text-primary">LPR</h1>
                    <ChevronDown className={`transition-transform duration-300 group-hover:text-accent ${isHeaderOpen ? "" : "-rotate-90"}`} />
                    <span className="sr-only">Mostrar/Ocultar formulário de upload</span>
                </div>
            </CollapsibleTrigger>
             <div className="flex items-center gap-2">
                <Button onClick={toggleTheme} variant="outline" size="icon">
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="sr-only">Alternar tema</span>
                </Button>
                <Button onClick={logout} variant="outline" size="icon">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sair</span>
                </Button>
            </div>
          </div>
          <CollapsibleContent>
             <div className="text-center py-4">
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                    Faça o upload de uma planilha ou arquivo JSON para exibir as imagens a partir de qualquer URL encontrada no arquivo.
                </p>
                <Card className="max-w-lg mx-auto mt-4">
                  <CardHeader>
                    <CardTitle className="text-xl">Anexe o Arquivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex-grow">
                      <Input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        aria-describedby="file-upload-help"
                      />
                      <Button asChild variant="outline" className="w-full justify-center text-left font-normal" disabled={isLoading}>
                        <Label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center w-full h-full">
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {isLoading ? 'Processando...' : 'Selecione um arquivo'}
                        </Label>
                      </Button>
                      <p id="file-upload-help" className="text-xs text-muted-foreground mt-2">Formatos suportados: .csv, .xlsx, .xls, .json</p>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>


        {data.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg flex flex-col md:flex-row justify-center items-center gap-4 flex-wrap sticky top-4 z-10 border">
            <div className="relative w-full md:w-auto md:flex-grow max-w-sm">
              <Input 
                placeholder="Pesquisar por placa, marca ou modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
                aria-label="Pesquisa global"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[120px] justify-start">
                      {filter === 'all' && <><List className="mr-2 h-4 w-4" /> Todos</>}
                      {filter === 'Carro' && <><Car className="mr-2 h-4 w-4" /> Carros</>}
                      {filter === 'Moto' && <><Bike className="mr-2 h-4 w-4" /> Motos</>}
                      {filter === 'Caminhão' && <><Truck className="mr-2 h-4 w-4" /> Caminhões</>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setFilter('all')}>
                      <List className="mr-2 h-4 w-4" />
                      Todos
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFilter('Carro')}>
                      <Car className="mr-2 h-4 w-4" />
                      Carros
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFilter('Moto')}>
                      <Bike className="mr-2 h-4 w-4" />
                      Motos
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFilter('Caminhão')}>
                      <Truck className="mr-2 h-4 w-4" />
                      Caminhões
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {availableColors.length > 2 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[120px] justify-start capitalize">
                        <Palette className="mr-2 h-4 w-4" />
                        {colorFilter === 'all' ? 'Cores' : colorFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {availableColors.map(color => (
                        <DropdownMenuItem key={color} onSelect={() => setColorFilter(color as string)} className="capitalize">
                          {color === 'all' ? <List className="mr-2 h-4 w-4" /> : <div className="mr-2 h-4 w-4 rounded-full border" style={{ backgroundColor: color as string }} />}
                          {color === 'all' ? 'Todas as cores' : color}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
            <Collapsible className="w-full md:w-auto">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">Filtros Avançados <ChevronDown className="ml-2 h-4 w-4"/></Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 md:absolute md:mt-2 md:bg-card md:p-4 md:rounded-lg md:shadow-lg md:border flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex gap-2 items-center">
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={"outline"}
                             size="sm"
                            className={cn(
                              "w-[260px] justify-start text-left font-normal",
                              !filterDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDate?.from ? (
                              filterDate.to ? (
                                <>
                                  {format(filterDate.from, "LLL dd, y")} -{" "}
                                  {format(filterDate.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(filterDate.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Selecione um período</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={filterDate?.from}
                            selected={filterDate}
                            onSelect={setFilterDate}
                            numberOfMonths={2}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="sm" onClick={() => setFilterDate(undefined)} disabled={!filterDate}>
                        Limpar
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div className="grid gap-1">
                          <Label htmlFor="start-time" className="text-xs">Início</Label>
                          <Input 
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-24"
                          />
                      </div>
                      <div className="grid gap-1">
                          <Label htmlFor="end-time" className="text-xs">Fim</Label>
                          <Input 
                          id="end-time"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-24"
                          />
                      </div>
                    </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
             <Button onClick={handleDownloadAll} size="sm" variant="outline" disabled={isDownloading || availableData.length === 0}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                {isDownloading ? 'Baixando...' : `Baixar Imagens`}
              </Button>
              <Collapsible className="w-full md:w-auto">
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" /> Gerar Relatório
                    </Button>
                </CollapsibleTrigger>
                 <CollapsibleContent>
                    <div className="mt-4 md:absolute md:mt-2 md:bg-card md:p-4 md:rounded-lg md:shadow-lg md:border flex flex-col md:flex-row gap-2 items-center">
                        <div className="grid gap-1">
                            <Label htmlFor="report-filename" className="text-xs">Nome do Relatório</Label>
                            <Input
                            id="report-filename"
                            type="text"
                            value={reportFilename}
                            onChange={(e) => setReportFilename(e.target.value)}
                            className="w-40 h-9"
                            placeholder="relatorio_lpr"
                            />
                        </div>
                        <Button onClick={handleGenerateReport} size="sm" disabled={isGeneratingReport || data.length === 0}>
                            {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isGeneratingReport ? 'Gerando...' : 'Baixar PDF'}
                        </Button>
                    </div>
                </CollapsibleContent>
              </Collapsible>
              <Button onClick={() => {
                setMapKey(Date.now());
                setIsMapOpen(true);
                }} 
                disabled={availableData.length === 0}
                variant="outline"
                size="sm"
                >
                <MapIcon className="mr-2 h-4 w-4" />
                Ver no Mapa
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsTimelineOpen(!isTimelineOpen)}>
                <PanelLeft className="mr-2 h-4 w-4" />
                {isTimelineOpen ? "Ocultar Linha do Tempo" : "Mostrar Linha do Tempo"}
              </Button>
          </div>
        )}
        
        {polygonFilteredData && (
          <div className="mt-4 text-center">
            <Card className="inline-block p-2 pr-4">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">
                  Mostrando {polygonFilteredData.length} resultados filtrados pelo polígono no mapa.
                </p>
                <Button variant="ghost" size="icon" onClick={() => setPolygonFilteredData(null)}>
                  <FilterX className="h-4 w-4" />
                  <span className="sr-only">Limpar filtro de polígono</span>
                </Button>
              </div>
            </Card>
          </div>
        )}

        <main className="mt-8 flex gap-8">
            <div className="flex-1">
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
                {!isLoading && availableData.length > 0 && renderGrid(availableData)}
                {!isLoading && data.length > 0 && availableData.length === 0 && unavailableData.length === 0 && (
                <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed bg-muted/20">
                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">Nenhum item encontrado</h3>
                    <p className="text-muted-foreground mt-2">Ajuste seus filtros ou carregue um novo arquivo.</p>
                </Card>
                )}
                
                {unavailableData.length > 0 && (
                <Collapsible className="mt-12">
                    <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer w-full border-b pb-2 mb-4 justify-center">
                        <ImageOff className="text-muted-foreground"/>
                        <h2 className="text-lg font-semibold text-muted-foreground">
                        Itens com Imagens Indisponíveis ({unavailableData.length})
                        </h2>
                        <ChevronDown className="transition-transform duration-300 [&[data-state=open]]:-rotate-180" />
                    </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                    {renderGrid(unavailableData, true)}
                    </CollapsibleContent>
                </Collapsible>
                )}
            </div>
            {isTimelineOpen && data.length > 0 && (
                <TimelineSidebar 
                data={sortedData}
                onItemClick={handleImageClick}
                onDateHover={setHoveredDate}
                />
            )}
        </main>
      </div>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-7xl w-full h-[95vh] p-2 flex flex-col">
            <DialogHeader>
                <DialogTitle>Mapa de Câmeras</DialogTitle>
                <DialogDescription>
                    Visualização das câmeras no mapa. Use as ferramentas para desenhar uma área e filtrar os resultados.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow rounded-md overflow-hidden">
              {isMapOpen && <VehicleMap key={mapKey} data={data} onFilter={setPolygonFilteredData} onFilterComplete={() => setIsMapOpen(false)} />}
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
             <div className="flex-shrink-0 p-4 bg-muted/50 rounded-b-lg mt-2 space-y-2">
                {selectedItem["License Plate"] && (
                  <div 
                    className="mx-auto h-16 w-64 rounded-md flex items-center justify-center shadow-md" 
                    style={{ 
                      backgroundImage: `url(${mercosulPlateBase64})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    <p className="text-black text-4xl font-bold tracking-widest" style={{ fontFamily: feFontBase64 ? 'FE-Font' : 'monospace' }}>
                      {selectedItem["License Plate"]}
                    </p>
                  </div>
                )}
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                   {selectedItem.Marca && (
                     <p><span className="font-semibold">Marca:</span> {selectedItem.Marca}</p>
                   )}
                   {selectedItem.Model && (
                     <p><span className="font-semibold">Modelo:</span> {selectedItem.Model}</p>
                   )}
                   {selectedItem.Cor && (
                     <p><span className="font-semibold">Cor:</span> {selectedItem.Cor}</p>
                   )}
                   {selectedItem["Detected At"] && (
                      <p><span className="font-semibold">Detectado em:</span> {new Date(selectedItem["Detected At"]).toLocaleString()}</p>
                   )}
                   {selectedItem.CameraTitle && selectedItem.CameraID && (
                     <p><span className="font-semibold">Local:</span>{' '}
                       <Link href={`https://smartsampa.sentinelx.com.br/cameras/map/${selectedItem.CameraID}`} target="_blank" className="hover:underline">
                         {selectedItem.CameraTitle}
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

    

    
