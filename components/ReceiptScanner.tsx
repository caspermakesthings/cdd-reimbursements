'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Image, Upload } from 'lucide-react'
import ImagePreviewCrop from '@/components/ImagePreviewCrop'
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
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const photoInputRef = React.useRef<HTMLInputElement>(null)

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

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Photos from library should show cropping interface
      setUploadedFile(file)
    }
  }

  const handleUploadCropAccept = (croppedFile: File) => {
    setUploadedFile(null)
    onFileSelect(croppedFile)
  }

  const handleUploadCropCancel = () => {
    setUploadedFile(null)
    // Reset file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  const handlePhotoLibraryClick = () => {
    photoInputRef.current?.click()
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
        {/* File Inputs (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileUpload}
          className="hidden"
          disabled={disabled}
        />
        
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col gap-3">
          {/* Select Photo Button - Primary on Mobile */}
          <Button
            type="button"
            onClick={handlePhotoLibraryClick}
            disabled={disabled}
            className="h-14 md:h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl md:rounded-lg shadow-md active:scale-95 transition-all duration-150"
          >
            <Image className="h-5 w-5 mr-2" />
            Select Photo
          </Button>

          {/* Upload File Button - Secondary */}
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            variant="outline"
            className="h-14 md:h-12 rounded-xl md:rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all duration-150"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload File
          </Button>
        </div>

        {/* Help Text - Mobile Optimized */}
        <div className="text-xs md:text-sm text-slate-500 bg-slate-50 rounded-lg p-3 md:bg-transparent md:p-0">
          <p className="font-medium mb-2 md:mb-1 text-slate-700">Receipt Options:</p>
          <ul className="space-y-2 md:space-y-1 text-xs">
            <li className="flex items-center">
              <Image className="h-3 w-3 mr-2 flex-shrink-0 text-slate-600" />
              <span>Select a photo from your photo library</span>
            </li>
            <li className="flex items-center">
              <Upload className="h-3 w-3 mr-2 flex-shrink-0 text-slate-600" />
              <span>Upload JPG, PNG, HEIC, or PDF files (max 10MB)</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}