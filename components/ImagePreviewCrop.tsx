'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, RotateCw, Crop, Loader2 } from 'lucide-react'
import { detectDocumentRectangle, cropToRectangle, Rectangle, Point, ProcessedImage } from '@/lib/imageProcessing'

interface ImagePreviewCropProps {
  file: File
  onAccept: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImagePreviewCrop({ file, onAccept, onCancel }: ImagePreviewCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<SVGSVGElement>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null)
  const [cropPoints, setCropPoints] = useState<Rectangle | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPointIndex, setDragPointIndex] = useState<number>(-1)
  const [showAutoDetection, setShowAutoDetection] = useState(true)

  useEffect(() => {
    processImage()
  }, [file])

  const processImage = async () => {
    setIsProcessing(true)
    
    try {
      const img = new Image()
      img.onload = async () => {
        try {
          const processed = await detectDocumentRectangle(img)
          setProcessedImage(processed)
          
          if (processed.detectedRectangle && processed.confidence > 30) {
            setCropPoints(processed.detectedRectangle)
          } else {
            // Fallback to full image bounds with small margin
            const margin = Math.min(img.naturalWidth, img.naturalHeight) * 0.05
            setCropPoints({
              topLeft: { x: margin, y: margin },
              topRight: { x: img.naturalWidth - margin, y: margin },
              bottomRight: { x: img.naturalWidth - margin, y: img.naturalHeight - margin },
              bottomLeft: { x: margin, y: img.naturalHeight - margin }
            })
          }
          
          // Draw the image on canvas
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              canvas.width = img.naturalWidth
              canvas.height = img.naturalHeight
              ctx.drawImage(img, 0, 0)
            }
          }
          
          setIsProcessing(false)
        } catch (error) {
          console.error('Image processing failed:', error)
          setIsProcessing(false)
        }
      }
      
      img.src = URL.createObjectURL(file)
    } catch (error) {
      console.error('Failed to load image:', error)
      setIsProcessing(false)
    }
  }

  const handleAutoDetect = async () => {
    if (!processedImage) return
    
    setIsProcessing(true)
    try {
      const processed = await detectDocumentRectangle(processedImage.canvas)
      if (processed.detectedRectangle) {
        setCropPoints(processed.detectedRectangle)
      }
    } catch (error) {
      console.error('Auto-detection failed:', error)
    }
    setIsProcessing(false)
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, pointIndex: number) => {
    setIsDragging(true)
    setDragPointIndex(pointIndex)
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || dragPointIndex === -1 || !cropPoints || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    const newPoints = { ...cropPoints }
    const pointKeys = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const
    const key = pointKeys[dragPointIndex]
    
    newPoints[key] = { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) }
    setCropPoints(newPoints)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragPointIndex(-1)
  }

  const handleAccept = async () => {
    if (!cropPoints || !canvasRef.current) return
    
    setIsProcessing(true)
    try {
      const croppedCanvas = await cropToRectangle(canvasRef.current, cropPoints)
      
      // Convert canvas to blob and create file
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const croppedFile = new File([blob], `receipt-cropped-${timestamp}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          onAccept(croppedFile)
        }
      }, 'image/jpeg', 0.9)
    } catch (error) {
      console.error('Cropping failed:', error)
      setIsProcessing(false)
    }
  }

  const renderCropOverlay = () => {
    if (!cropPoints || !canvasRef.current) return null

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height

    const points = [
      cropPoints.topLeft,
      cropPoints.topRight, 
      cropPoints.bottomRight,
      cropPoints.bottomLeft
    ]

    const scaledPoints = points.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    }))

    const pathData = `M ${scaledPoints[0].x} ${scaledPoints[0].y} L ${scaledPoints[1].x} ${scaledPoints[1].y} L ${scaledPoints[2].x} ${scaledPoints[2].y} L ${scaledPoints[3].x} ${scaledPoints[3].y} Z`

    return (
      <svg
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ 
          width: rect.width, 
          height: rect.height 
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Semi-transparent overlay */}
        <defs>
          <mask id="crop-mask">
            <rect width="100%" height="100%" fill="white" />
            <path d={pathData} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#crop-mask)"
        />
        
        {/* Crop area outline */}
        <path
          d={pathData}
          stroke="#10b981"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
        />
        
        {/* Corner handles */}
        {scaledPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="8"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleMouseDown(e, index)}
          />
        ))}
        
        {/* Corner labels */}
        {scaledPoints.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={point.y - 15}
            textAnchor="middle"
            className="fill-white text-xs font-medium pointer-events-none"
          >
            {index + 1}
          </text>
        ))}
      </svg>
    )
  }

  if (isProcessing && !processedImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Processing Image
            </h3>
            <p className="text-sm text-gray-500">
              Detecting receipt edges...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-800"
          disabled={isProcessing}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <h2 className="text-white font-medium">Crop Receipt</h2>
        
        <Button
          onClick={handleAutoDetect}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-800"
          disabled={isProcessing}
        >
          <Crop className="h-5 w-5" />
        </Button>
      </div>

      {/* Image Preview */}
      <div className="flex-1 relative overflow-hidden bg-gray-900 flex items-center justify-center p-4">
        {processedImage && (
          <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain"
              style={{ 
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block'
              }}
            />
            
            {cropPoints && renderCropOverlay()}
          </div>
        )}
        
        {processedImage && processedImage.confidence > 30 && showAutoDetection && (
          <div className="absolute top-4 left-4 right-4 bg-green-600 text-white p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crop className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  Receipt detected! (Confidence: {Math.round(processedImage.confidence)}%)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-green-700 h-6 w-6 p-0"
                onClick={() => setShowAutoDetection(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs mt-1 opacity-90">
              Drag the corner points to adjust the crop area.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-black">
        <div className="flex items-center justify-between">
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleAutoDetect}
              variant="outline"
              className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
              disabled={isProcessing}
            >
              <Crop className="h-4 w-4 mr-2" />
              Auto Detect
            </Button>
            
            <Button
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isProcessing || !cropPoints}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept Crop
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}