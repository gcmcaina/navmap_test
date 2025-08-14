"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, ExternalLink, Search, Loader2 } from "lucide-react";
import type { PlateData } from "@/types";
import { suggestSearchQueries } from "@/ai/flows/suggest-search-queries";

interface ImageModalProps {
  data: PlateData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ data, isOpen, onClose }: ImageModalProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen && data) {
      const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        setSuggestions([]);
        try {
          const result = await suggestSearchQueries({
            make: data.Make,
            model: data.Model,
            year: data.Year,
          });
          setSuggestions(result.suggestions);
        } catch (error) {
          console.error("Error fetching AI suggestions:", error);
           toast({
            variant: "destructive",
            title: "AI Error",
            description: "Could not fetch search suggestions.",
          });
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    }
  }, [isOpen, data, toast]);

  if (!data) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: text });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(data["Image URL"]);
      if (!response.ok) throw new Error("Network response was not ok.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileExtension = data["Image URL"].split('.').pop()?.split('?')[0] || 'jpg';
      link.href = url;
      link.download = `${data["License Plate"]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (error) {
      console.error("Failed to download image", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the image.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">{data["License Plate"]}</DialogTitle>
          <DialogDescription>
            {data.Make} {data.Model} - {data.Year}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={data["Image URL"]}
              alt={data["License Plate"]}
              layout="fill"
              objectFit="contain"
              unoptimized
               onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/600x400.png';
                e.currentTarget.dataset.aiHint = "broken image";
              }}
            />
          </div>
          <div className="flex flex-col space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleCopy(data["License Plate"])}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Plate
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download Image
                </Button>
                <Button variant="outline" asChild>
                  <a href={data["Image URL"]} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Original URL
                  </a>
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Search className="mr-2 h-4 w-4 text-primary" /> AI Search Suggestions
              </h4>
              <div className="flex flex-col space-y-2">
                {isLoadingSuggestions ? (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-4/5" />
                    <Skeleton className="h-8 w-full" />
                  </>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <Button variant="ghost" className="justify-start" key={index} asChild>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(suggestion)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                         {suggestion}
                      </a>
                    </Button>
                  ))
                )}
                { !isLoadingSuggestions && suggestions.length === 0 && <p className="text-sm text-muted-foreground">No suggestions available.</p>}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose} variant="secondary">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
