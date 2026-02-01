import React, { useState, useRef } from 'react';
import { Button } from './core';

// Extend File interface to include path property (available in Electron)
interface ElectronFile extends File {
  path: string;
}

interface LogoProcessorProps {
  onLogoProcessed?: (processedPath: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface LogoPreview {
  original: string;
  processed?: string;
  isProcessing: boolean;
}

export const LogoProcessor: React.FC<LogoProcessorProps> = ({
  onLogoProcessed,
  onError,
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<LogoPreview | null>(null);
  const [originalPath, setOriginalPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] as ElectronFile;
    if (!file) return;

    try {
      setIsProcessing(true);
      
      // Validate file first
      const validation = await window.electronAPI?.validateLogoFile(file.path) as { valid: boolean; error?: string };
      if (!validation?.valid) {
        throw new Error(validation?.error || 'Invalid file');
      }

      setOriginalPath(file.path);
      
      // Create preview URL
      const originalPreview = URL.createObjectURL(file);
      setPreview({
        original: originalPreview,
        isProcessing: true
      });

      // Process the logo
      const processedPath = await window.electronAPI?.autoProcessLogo(file.path) as string;
      
      if (processedPath) {
        // Convert processed logo to base64 data URL for display
        const processedBase64 = await window.electronAPI?.getProcessedLogoBase64(processedPath) as string;
        
        setPreview({
          original: originalPreview,
          processed: processedBase64,
          isProcessing: false
        });
        
        onLogoProcessed?.(processedPath);
      } else {
        setPreview({
          original: originalPreview,
          isProcessing: false
        });
      }

    } catch (error) {
      console.error('Logo processing error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to process logo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearLogo = () => {
    if (preview?.original && preview.original.startsWith('blob:')) {
      URL.revokeObjectURL(preview.original);
    }
    setPreview(null);
    setOriginalPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`logo-processor ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="space-y-4">
        {/* Upload Button */}
        <Button
          onClick={handleButtonClick}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing Logo...' : 'Upload & Process Logo'}
        </Button>

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Logo */}
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <img
                  src={preview.original}
                  alt="Original Logo"
                  className="max-w-full max-h-32 mx-auto object-contain"
                />
                <p className="text-sm text-gray-500 mt-2 font-medium">Original Logo</p>
              </div>

              {/* Processed Logo */}
              <div className="relative border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                {preview.isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-32">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm text-blue-600">Processing...</p>
                  </div>
                ) : preview.processed ? (
                  <>
                    <img
                      src={preview.processed}
                      alt="Processed Logo"
                      className="max-w-full max-h-32 mx-auto object-contain"
                    />
                    <p className="text-sm text-blue-600 mt-2 font-medium">Processed Logo</p>
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Ready
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-gray-300 rounded-full mb-2"></div>
                    <p className="text-sm text-gray-500">Processing failed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Clear Button */}
            <div className="flex justify-end">
              <Button
                onClick={clearLogo}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LogoProcessor;
