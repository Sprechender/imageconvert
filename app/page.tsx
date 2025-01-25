'use client';
import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon } from "lucide-react";

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

interface ImageState {
  file: File | null;
  previewUrl: string | null;
  currentPreviewUrl: string | null;
  nextPreviewUrl: string | null;
}

interface ConversionSettings {
  format: string;
  quality: number;
  autoQuality: boolean;
}

export default function Home() {
  const [pageReady, setPageReady] = useState(false);
  
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    previewUrl: null,
    currentPreviewUrl: null,
    nextPreviewUrl: null
  });

  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'jpeg',
    quality: 95,
    autoQuality: true
  });

  const [loadingStates, setLoadingStates] = useState({
    converting: false,
    preview: false,
    initial: false
  });

  const [error, setError] = useState<string | null>(null);

  const supportsQuality = useMemo(() => 
    ['jpeg', 'webp'].includes(settings.format), 
    [settings.format]
  );

  const handleFileDrop = useCallback((file: File) => {
    setError(null);
    const maxSize = 20 * 1024 * 1024;
    
    if (file.size > maxSize) {
      setError("File size exceeds 20MB limit");
      return;
    }
    
    const previewUrl = URL.createObjectURL(file);
    setImageState(prev => ({
      ...prev,
      file,
      previewUrl,
      currentPreviewUrl: previewUrl
    }));

    if (settings.autoQuality && ['jpeg', 'webp'].includes(settings.format)) {
      const autoQuality = getAutoQuality(file, settings.format);
      setSettings(prev => ({
        ...prev,
        quality: autoQuality
      }));
    }
  }, [settings.autoQuality, settings.format]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: acceptedFiles => acceptedFiles[0] && handleFileDrop(acceptedFiles[0])
  });

  useEffect(() => {
    if (!imageState.file || !supportsQuality) return;

    let isMounted = true;
    const debounceTimeout = setTimeout(async () => {
      try {
        setLoadingStates(prev => ({ ...prev, preview: true }));
        const newPreviewUrl = await generatePreview(
          imageState.file!,
          settings.format,
          settings.quality
        );
        
        if (isMounted) {
          setImageState(prev => {
            if (prev.nextPreviewUrl && prev.nextPreviewUrl !== newPreviewUrl) {
              URL.revokeObjectURL(prev.nextPreviewUrl);
            }
            return {
              ...prev,
              nextPreviewUrl: newPreviewUrl,
              currentPreviewUrl: newPreviewUrl
            };
          });
        }
      } catch (error) {
        console.error('Preview generation failed:', error);
      } finally {
        if (isMounted) {
          setLoadingStates(prev => ({ ...prev, preview: false }));
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimeout);
    };
  }, [imageState.file, settings.quality, settings.format, supportsQuality]);

  useEffect(() => {
    return () => {
      if (imageState.previewUrl) URL.revokeObjectURL(imageState.previewUrl);
      if (imageState.nextPreviewUrl) URL.revokeObjectURL(imageState.nextPreviewUrl);
    };
  }, []);

  const handleFormatChange = useCallback((format: string) => {
    setSettings(prev => {
      if (prev.autoQuality && ['jpeg', 'webp'].includes(format) && imageState.file) {
        return {
          ...prev,
          format,
          quality: getAutoQuality(imageState.file, format)
        };
      }
      return {
        ...prev,
        format,
        quality: !['jpeg', 'webp'].includes(format) ? 100 : prev.quality
      };
    });
  }, [imageState.file]);

  useEffect(() => {
    if (settings.autoQuality && imageState.file && ['jpeg', 'webp'].includes(settings.format)) {
      const autoQuality = getAutoQuality(imageState.file, settings.format);
      setSettings(prev => ({
        ...prev,
        quality: autoQuality
      }));
    }
  }, [settings.autoQuality, settings.format, imageState.file]);

  const handleConvert = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageState.file) return;

    try {
      setLoadingStates(prev => ({ ...prev, converting: true }));
      const blob = await convertImage(
        imageState.file,
        settings.format,
        settings.quality
      );
      
      const url = URL.createObjectURL(blob);
      const originalName = imageState.file.name.split('.').slice(0, -1).join('.');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${originalName}-${settings.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Conversion failed:', error);
      setError('Failed to convert image');
    } finally {
      setLoadingStates(prev => ({ ...prev, converting: false }));
    }
  }, [imageState.file, settings.format, settings.quality]);

  const handleQualityChange = useCallback((value: number[]) => {
    setSettings(prev => ({
      ...prev,
      quality: value[0],
      autoQuality: false
    }));
  }, []);

  useEffect(() => {
    setPageReady(true);
  }, []);

  if (!pageReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <header className="rounded-lg bg-background border p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">imageconvert</h1>
            <p className="text-muted-foreground text-lg">Convert and optimize your images instantly</p>
          </div>
          <div className="flex items-center gap-3">
            <GithubLink />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card className="transition-all duration-200 hover:shadow-lg">
            <CardContent className="pt-6">
              <div 
                {...getRootProps()} 
                className={`rounded-lg p-12 text-center transition-colors duration-200 border-2 border-dashed relative
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : imageState.file 
                      ? 'border-primary/50 hover:border-primary' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
              >
                {isDragActive && (
                  <div className="absolute inset-0 bg-primary/5 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-primary mx-auto animate-bounce" />
                      <p className="text-xl font-medium text-primary">Drop to convert</p>
                      <p className="text-sm text-muted-foreground">Release to begin optimization</p>
                    </div>
                  </div>
                )}
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                    <ImageIcon className={`w-8 h-8 transition-colors ${imageState.file ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {imageState.file ? (
                        <span className="text-primary hover:underline cursor-pointer">Choose another image</span>
                      ) : (
                        "Drop your image here"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {imageState.file ? (
                        <>
                          <span className="font-medium">{imageState.file.name}</span>
                          <br />
                          <span>({(imageState.file.size / 1024 / 1024).toFixed(2)}MB)</span>
                        </>
                      ) : (
                        <>
                          <span>Drag and drop or click to upload</span>
                          <br />
                          <span className="text-xs">Supports JPG, PNG, WebP (max 20MB)</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Convert Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConvert} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base">Output Format</Label>
                    <Select value={settings.format} onValueChange={handleFormatChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webp">WebP (Recommended)</SelectItem>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="avif">AVIF (Beta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {supportsQuality && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Quality</Label>
                        <div className="flex items-center gap-3">
                          <Label htmlFor="autoQuality" className="text-sm font-normal">Auto-optimize</Label>
                          <Checkbox
                            id="autoQuality"
                            className="transition-transform hover:scale-105"
                            checked={settings.autoQuality}
                            onCheckedChange={(checked: boolean) => 
                              setSettings(prev => ({ ...prev, autoQuality: checked }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Slider
                          className="flex-1"
                          min={1}
                          max={100}
                          step={1}
                          value={[settings.quality]}
                          onValueChange={handleQualityChange}
                        />
                        <span className="w-12 text-right text-muted-foreground">
                          {settings.quality}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                  type="submit" 
                  size="lg"
                  disabled={!imageState.file || loadingStates.converting}
                >
                  {loadingStates.converting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin mr-3" />
                      Converting...
                    </>
                  ) : (
                    'Download Converted Image'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {imageState.previewUrl && (
          <Card className="lg:sticky lg:top-8 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">Preview</CardTitle>
              {imageState.file && (
                <CardDescription className="text-base">
                  Original size: {(imageState.file.size / 1024 / 1024).toFixed(2)}MB
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square bg-[url('/grid.svg')] dark:bg-zinc-900/50 rounded-lg overflow-hidden shadow-inner">
                <Image
                  src={imageState.previewUrl}
                  alt="Original"
                  fill
                  className="object-contain"
                  priority
                />
                
                {supportsQuality && imageState.currentPreviewUrl && (
                  <Image
                    src={imageState.currentPreviewUrl}
                    alt="Preview"
                    fill
                    className={`object-contain transition-opacity duration-300 ${
                      loadingStates.preview ? 'opacity-70' : 'opacity-100'
                    }`}
                    priority
                  />
                )}
                
                {loadingStates.preview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-10 h-10 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
