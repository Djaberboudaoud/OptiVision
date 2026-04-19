import { useState, useCallback } from 'react';
import { Upload, Camera, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import WebcamCapture from '@/components/WebcamCapture';

interface ImageUploadProps {
  onImageUpload: (file: File, previewUrl: string) => void;
}

export function ImageUpload({ onImageUpload }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  const validateImage = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsValidating(true);
      setError(null);

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPG, PNG, etc.)');
        setIsValidating(false);
        resolve(false);
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        setIsValidating(false);
        resolve(false);
        return;
      }

      // Simulate face detection validation
      setTimeout(() => {
        setIsValidating(false);
        resolve(true);
      }, 800);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const isValid = await validateImage(file);
    if (isValid) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageUpload(file, url);
    }
  }, [validateImage, onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleWebcamCapture = useCallback((file: File) => {
    setShowWebcam(false);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImageUpload(file, url);
  }, [onImageUpload]);

  if (showWebcam) {
    return (
      <WebcamCapture
        onCapture={handleWebcamCapture}
        onCancel={() => setShowWebcam(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-3">
          Upload Your Photo
        </h2>
        <p className="text-muted-foreground">
          Take or upload a clear, front-facing photo for the best results
        </p>
      </div>

      <div
        className={cn(
          'upload-zone',
          isDragging && 'upload-zone-active',
          preview && 'border-primary/30'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          id="image-upload"
        />

        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={preview}
                alt="Uploaded preview"
                className="w-48 h-48 object-cover rounded-2xl shadow-card"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Image uploaded successfully</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              {isValidating ? (
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>

            <div className="text-center">
              <p className="font-medium text-foreground mb-1">
                {isValidating ? 'Validating image...' : 'Drag and drop your photo here'}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>

            <div className="flex items-center gap-4 mt-2 relative z-10">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <label htmlFor="image-upload" className="cursor-pointer">
                  <ImageIcon className="w-4 h-4" />
                  Browse Files
                </label>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  setShowWebcam(true);
                }}
              >
                <Camera className="w-4 h-4" />
                Use Webcam
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-muted/50">
        <h4 className="font-medium text-sm text-foreground mb-2">Photo Guidelines:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Face should be clearly visible and centered
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Good lighting, no heavy shadows
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Remove existing glasses if possible
          </li>
        </ul>
      </div>
    </div>
  );
}
