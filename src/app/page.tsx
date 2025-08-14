"use client";

import { useState } from "react";
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
} from "lucide-react";


export default function PlateGalleryPage() {
  const [data, setData] = useState<PlateData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const urls: string[] = [];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Regular expression to find URLs in cell content
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        jsonData.forEach(row => {
          row.forEach(cell => {
            if (typeof cell === 'string') {
              const found = cell.match(urlRegex);
              if (found) {
                urls.push(...found);
              }
            }
          });
        });

        if (urls.length === 0) {
          throw new Error("No image URLs found in the uploaded file.");
        }

        const formattedData: PlateData[] = urls.map((url, index) => ({
          id: `${file.name}-${index}`,
          "Image URL": url,
          "License Plate": "N/A",
          Make: "N/A",
          Model: "N/A",
          Year: "N/A",
        }));

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
  
  const renderGrid = () => (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {data.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden group transition-all duration-300 hover:shadow-xl cursor-pointer"
          onClick={() => setSelectedImage(item["Image URL"])}
        >
          <div className="relative w-full aspect-square bg-muted">
            <Image
              src={item["Image URL"]}
              alt={item["License Plate"] || 'Vehicle Image'}
              layout="fill"
              objectFit="cover"
              className="group-hover:opacity-90 transition-opacity"
              unoptimized
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/400x400.png';
                e.currentTarget.dataset.aiHint = "broken image";
              }}
            />
          </div>
          <div className="p-3 bg-card text-center">
            <p className="font-bold text-lg truncate">{item["Image URL"]}</p>
          </div>
        </Card>
      ))}
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
          {!isLoading && data.length > 0 && renderGrid()}
        </main>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
          {selectedImage && (
            <div className="relative w-full h-full">
                <Image
                    src={selectedImage}
                    alt="Selected image"
                    width={1000}
                    height={1000}
                    className="w-full h-auto object-contain rounded-lg"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/800x800.png'
                      e.currentTarget.dataset.aiHint = "broken image";
                    }}
                />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
