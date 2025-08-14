"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import Image from "next/image";
import type { PlateData } from "@/types";
import { ImageModal } from "@/components/image-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

type SortConfig = {
  key: keyof PlateData;
  direction: "ascending" | "descending";
};

export default function PlateGalleryPage() {
  const [data, setData] = useState<PlateData[]>([]);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{ [key: string]: string }>({
    Year: "all",
    Make: "all",
  });
  const [selectedImage, setSelectedImage] = useState<PlateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
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
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
          defval: "",
          transform: (value, header) => header.trim(),
        });
        
        const rawHeaders: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as any;
        const headers = rawHeaders.map(h => h.trim());

        const requiredColumns = ["Image URL", "License Plate", "Make", "Model", "Year"];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
        }

        const formattedData: PlateData[] = jsonData.map((row, index) => {
          const newRow: { [key: string]: any } = {};
          for (const key in row) {
            newRow[key.trim()] = row[key];
          }
          return {
            id: `${file.name}-${index}`,
            "Image URL": newRow["Image URL"]?.toString() || "",
            "License Plate": newRow["License Plate"]?.toString() || "",
            Make: newRow["Make"]?.toString() || "",
            Model: newRow["Model"]?.toString() || "",
            Year: newRow["Year"]?.toString() || "",
          }
        });

        setData(formattedData);
        toast({
          title: "Success",
          description: `${formattedData.length} records loaded successfully.`,
        });
      } catch (error: any) {
        console.error("Error parsing file:", error);
        toast({
          variant: "destructive",
          title: "File Upload Error",
          description: error.message || "Could not parse the uploaded file. Please check the format.",
        });
        setData([]);
      } finally {
        setIsLoading(false);
        event.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const getUniqueValues = useCallback((key: keyof PlateData) => {
    return [...new Set(data.map((item) => item[key]))].filter(Boolean).sort();
  }, [data]);

  const uniqueYears = useMemo(() => getUniqueValues("Year"), [data, getUniqueValues]);
  const uniqueMakes = useMemo(() => getUniqueValues("Make"), [data, getUniqueValues]);

  const filteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const searchMatch =
        searchQuery === "" ||
        Object.values(item)
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const filterMatch = Object.entries(filters).every(([key, value]) => {
        if (value === "all") return true;
        return item[key as keyof PlateData]?.toString() === value;
      });

      return searchMatch && filterMatch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, filters, sortConfig]);

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "No data to export.",
      });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Plates");
    XLSX.writeFile(workbook, "filtered_plate_data.xlsx");
    toast({
      title: "Export Successful",
      description: "Filtered data has been downloaded.",
    });
  };

  const requestSort = (key: keyof PlateData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderTable = () => (
    <Card className="mt-6">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(data[0] || {}).filter(k => k !== 'id').map((key) => (
                  <TableHead key={key} className="cursor-pointer hover:bg-muted" onClick={() => requestSort(key as keyof PlateData)}>
                    {key} {sortConfig?.key === key && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setSelectedImage(item)}
                  className="cursor-pointer"
                >
                  {Object.entries(item).filter(([k]) => k !== 'id').map(([key, value]) => (
                     <TableCell key={`${item.id}-${key}`} className={key === 'Image URL' ? 'max-w-xs truncate' : ''}>
                      {key === 'Image URL' ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{value}</a> : value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderGrid = () => (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {filteredData.map((item) => (
        <Card
          key={item.id}
          onClick={() => setSelectedImage(item)}
          className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-105"
        >
          <div className="relative w-full aspect-video bg-muted">
            <Image
              src={item["Image URL"]}
              alt={item["License Plate"]}
              layout="fill"
              objectFit="cover"
              className="group-hover:opacity-90 transition-opacity"
              unoptimized
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/600x400.png';
                e.currentTarget.dataset.aiHint = "broken image";
              }}
            />
          </div>
          <div className="p-3 bg-card">
            <p className="font-bold text-lg">{item["License Plate"]}</p>
            <p className="text-sm text-muted-foreground">{`${item.Make} ${item.Model} (${item.Year})`}</p>
          </div>
        </Card>
      ))}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary">Plate Gallery</h1>
          <p className="text-muted-foreground mt-2">
            Upload, view, and manage license plate recognition data with ease.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-4 items-end">
              <div className="flex-grow">
                <label className="text-sm font-medium mb-2 block">Upload File</label>
                <div className="relative">
                  <Input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                   <Button asChild variant="outline" className="w-full justify-start text-left font-normal" disabled={isLoading}>
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
              <div className="flex-grow">
                 <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search all fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={data.length === 0}
                  />
                </div>
              </div>
              <div className="flex-grow">
                <label className="text-sm font-medium mb-2 block">Filter by Year</label>
                <Select onValueChange={(v) => handleFilterChange("Year", v)} defaultValue="all" disabled={data.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {uniqueYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-grow">
                <label className="text-sm font-medium mb-2 block">Filter by Make</label>
                <Select onValueChange={(v) => handleFilterChange("Make", v)} defaultValue="all" disabled={data.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Make" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {uniqueMakes.map((make) => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")} disabled={data.length === 0}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={view === "table" ? "default" : "outline"} size="icon" onClick={() => setView("table")} disabled={data.length === 0}>
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button onClick={handleExport} variant="outline" disabled={data.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <main className="mt-6">
          {isLoading && (
            <div className="flex justify-center items-center h-64 flex-col">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Processing your file...</p>
            </div>
          )}
          {!isLoading && data.length === 0 && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Data Loaded</h3>
                <p className="text-muted-foreground mt-2">Upload a file to get started.</p>
                <p className="text-sm text-muted-foreground mt-1">Expected columns: Image URL, License Plate, Make, Model, Year.</p>
             </Card>
          )}
          {!isLoading && data.length > 0 && (view === "grid" ? renderGrid() : renderTable())}
           {!isLoading && data.length > 0 && filteredData.length === 0 && (
             <Card className="mt-6 text-center h-64 flex flex-col justify-center items-center border-dashed">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Results Found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
             </Card>
          )}
        </main>

        <ImageModal
          data={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      </div>
    </div>
  );
}
