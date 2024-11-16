'use client';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useDropzone } from 'react-dropzone';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { GithubLink } from "@/components/github-link"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { getAutoQuality, convertImage, generatePreview } from "@/lib/imageUtils";

export default function Home() {
  // State management for file handling and conversion
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  
  // Image conversion settings
  const [format, setFormat] = useState("jpeg");
  const [quality, setQuality] = useState(95);
  const [autoQuality, setAutoQuality] = useState(true);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  
  // Only JPEG and WebP support quality adjustment
  const supportsQuality = ['jpeg', 'webp'].includes(format);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = (file: File) => {
    setError(null);
    // Limit file size to 20MB
    const maxSize = 20 * 1024 * 1024;
    
    if (file.size > maxSize) {
      setError("File size exceeds 20MB limit");
      return;
    }
    
    // Create preview URL and update state
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Set automatic quality if enabled
    if (autoQuality) {
      setQuality(getAutoQuality(file, format));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': []
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleFileDrop(acceptedFiles[0]);
      }
    }
  });

  // Effect for live preview updates when quality/format changes
  useEffect(() => {
    const updateLivePreview = async () => {
      if (!selectedFile || !supportsQuality) {
        setLivePreviewUrl(previewUrl);
        return;
      }

      try {
        if (livePreviewUrl) {
          URL.revokeObjectURL(livePreviewUrl);
        }
        const newPreviewUrl = await generatePreview(selectedFile, format, quality);
        setLivePreviewUrl(newPreviewUrl);
      } catch (error) {
        console.error('Error updating live preview:', error);
      }
    };

    updateLivePreview();

    return () => {
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
      }
    };
  }, [selectedFile, quality, format, supportsQuality, previewUrl, livePreviewUrl]);

  // Automatically set quality based on file size and format
  useEffect(() => {
    if (selectedFile && autoQuality) {
      const automaticQuality = getAutoQuality(selectedFile, format);
      setQuality(automaticQuality);
    }
  }, [selectedFile, format, autoQuality]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setConverting(true);
      // Convert image using selected settings
      const blob = await convertImage(selectedFile, format, quality);
      
      // Trigger download with appropriate filename
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const originalName = selectedFile.name.split('.').slice(0, -1).join('.');
      a.href = url;
      a.download = `${originalName}-${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting image:', error);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 gap-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <GithubLink />
        <ThemeToggle />
      </div>
      <Card className="min-w-[400px] max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">imageconvert</CardTitle>
          <CardDescription className="truncate">
            {selectedFile ? selectedFile.name : "No file selected"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleConvert}>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/10' : selectedFile ? 'border-primary bg-green-100 dark:bg-green-900/20' : 'border-muted-foreground/25 hover:border-primary'}`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the image here...</p>
              ) : selectedFile ? (
                <p>Image selected - Click or drop to change</p>
              ) : (
                <div className="space-y-2">
                  <p>Drag & drop an image here, or click to select</p>
                  <p className="text-sm text-muted-foreground">Supports JPEG, PNG, WebP and AVIF</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Convert to</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="avif">AVIF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {supportsQuality && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="quality">Quality</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="autoQuality" className="text-sm text-muted-foreground">Auto</Label>
                    <Checkbox
                      id="autoQuality"
                      checked={autoQuality}
                      onCheckedChange={(checked: boolean) => setAutoQuality(checked)}
                    />
                    <span className="text-sm text-muted-foreground">{quality}%</span>
                  </div>
                </div>
                <Slider
                  id="quality"
                  min={1}
                  max={100}
                  step={1}
                  value={[quality]}
                  onValueChange={(value) => {
                    setAutoQuality(false);
                    setQuality(value[0]);
                  }}
                />
              </div>
            )}

            <Button className="w-full" type="submit" disabled={!selectedFile || converting}>
              {converting ? "Converting..." : "Download Image"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {previewUrl && (
        <Card className="min-w-[400px] max-w-lg">
          <CardContent className="pt-6">
            <div className="relative aspect-square">
              <Image
                src={supportsQuality ? (livePreviewUrl || previewUrl) : previewUrl}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
