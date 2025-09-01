'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload } from 'lucide-react'
import CameraPreview from '@/components/CameraPreview'
import ImagePreviewCrop from '@/components/ImagePreviewCrop'
import { checkCameraSupport } from '@/lib/camera'
import { useToast } from '@/components/ui/use-toast'

interface ReceiptScannerProps {
  onFileSelect: (file: File) => void
  accept?: string
  disabled?: boolean
}

export default function ReceiptScanner({ 
  onFileSelect, 
  accept = ".jpg,.jpeg,.png,.heic,.pdf",
  disabled = false 
}: ReceiptScannerProps) {
  const [showCamera, setShowCamera] = React.useState(false)
  const [cameraSupported, setCameraSupported] = React.useState<boolean | null>(null)
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Check camera support on mount
  React.useEffect(() => {
    checkCameraSupport().then(setCameraSupported)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's an image that can benefit from cropping
      if (file.type.startsWith('image/') && file.type !== 'image/gif') {
        setUploadedFile(file)
      } else {
        // PDFs and other files go directly
        onFileSelect(file)
      }
    }
  }

  const handleUploadCropAccept = (croppedFile: File) => {
    setUploadedFile(null)
    onFileSelect(croppedFile)
  }

  const handleUploadCropCancel = () => {
    setUploadedFile(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraCapture = (file: File) => {
    onFileSelect(file)
    setShowCamera(false)
    
    toast({
      title: "Receipt captured!",
      description: `Image saved as ${file.name}`,
    })
  }

  const handleCameraError = (error: string) => {
    console.error('Camera error:', error)
    toast({
      title: "Camera Error",
      description: error,
      variant: "destructive"
    })
    setShowCamera(false)
  }

  const handleScanClick = () => {
    if (cameraSupported) {
      setShowCamera(true)
    } else {
      toast({
        title: "Camera not available",
        description: "Please use the file upload option instead.",
        variant: "destructive"
      })
    }
  }

  // Show crop interface for uploaded images
  if (uploadedFile) {
    return (
      <ImagePreviewCrop
        file={uploadedFile}
        onAccept={handleUploadCropAccept}
        onCancel={handleUploadCropCancel}
      />
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* File Input (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileUpload}
          className="hidden"
          disabled={disabled}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Scan Receipt Button */}
          <Button
            type="button"
            onClick={handleScanClick}
            disabled={disabled || cameraSupported === false}
            variant="outline"
            className="flex-1 h-12"
          >
            <Camera className="h-4 w-4 mr-2" />
            {cameraSupported === null ? 'Checking camera...' : 
             cameraSupported ? 'Scan Receipt' : 'Camera unavailable'}
          </Button>

          {/* Upload File Button */}
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            variant="outline"
            className="flex-1 h-12"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-sm text-gray-500">
          <p className="font-medium mb-1">Receipt Options:</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center">
              <Camera className="h-3 w-3 mr-2 flex-shrink-0" />
              <span>Scan with your camera for best results</span>
            </li>
            <li className="flex items-center">
              <Upload className="h-3 w-3 mr-2 flex-shrink-0" />
              <span>Upload JPG, PNG, HEIC, or PDF files (max 10MB)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraPreview
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
          onError={handleCameraError}
        />
      )}
    </>
  )
}