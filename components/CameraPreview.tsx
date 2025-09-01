'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, RotateCcw, Loader2 } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import ImagePreviewCrop from '@/components/ImagePreviewCrop'

interface CameraPreviewProps {
  onCapture: (file: File) => void
  onCancel: () => void
  onError?: (error: string) => void
}

export default function CameraPreview({ onCapture, onCancel, onError }: CameraPreviewProps) {
  const { state, actions, videoRef } = useCamera()
  const [isCapturing, setIsCapturing] = React.useState(false)
  const [capturedFile, setCapturedFile] = React.useState<File | null>(null)

  // Start camera when component mounts
  React.useEffect(() => {
    if (state.isSupported) {
      actions.startCamera().catch(error => {
        console.error('Failed to start camera:', error)
        onError?.(error.message || 'Failed to start camera')
      })
    }

    // Cleanup on unmount
    return () => {
      actions.stopCamera()
    }
  }, [state.isSupported])

  // Handle capture
  const handleCapture = async () => {
    setIsCapturing(true)
    
    try {
      const file = await actions.captureImage()
      setCapturedFile(file)
    } catch (error: any) {
      console.error('Failed to capture image:', error)
      onError?.(error.message || 'Failed to capture image')
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle accepting cropped image
  const handleCropAccept = (croppedFile: File) => {
    setCapturedFile(null)
    onCapture(croppedFile)
  }

  // Handle canceling crop
  const handleCropCancel = () => {
    setCapturedFile(null)
  }

  // Handle camera switch (if multiple cameras available)
  const handleSwitchCamera = async () => {
    if (state.devices.length <= 1) return
    
    const currentIndex = state.devices.findIndex(d => d.deviceId === state.currentDeviceId)
    const nextIndex = (currentIndex + 1) % state.devices.length
    const nextDevice = state.devices[nextIndex]
    
    try {
      await actions.switchCamera(nextDevice.deviceId)
    } catch (error: any) {
      console.error('Failed to switch camera:', error)
      onError?.(error.message || 'Failed to switch camera')
    }
  }

  // Show crop interface if image was captured
  if (capturedFile) {
    return (
      <ImagePreviewCrop
        file={capturedFile}
        onAccept={handleCropAccept}
        onCancel={handleCropCancel}
      />
    )
  }

  if (!state.isSupported) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Camera Not Supported
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Your browser doesn't support camera access, or no camera was found.
            </p>
            <Button onClick={onCancel} className="w-full">
              Use File Upload Instead
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <X className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Camera Access Error
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {state.error}
            </p>
            <div className="space-y-2">
              <Button onClick={actions.clearError} variant="outline" className="w-full">
                Try Again
              </Button>
              <Button onClick={onCancel} className="w-full">
                Use File Upload Instead
              </Button>
            </div>
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
        >
          <X className="h-5 w-5" />
        </Button>
        
        <h2 className="text-white font-medium">Scan Receipt</h2>
        
        {state.devices.length > 1 && (
          <Button
            onClick={handleSwitchCamera}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
            disabled={state.isLoading}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative overflow-hidden">
        {state.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Starting camera...</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Mirror for better UX
            />
            
            {/* Overlay guides for receipt positioning */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full w-full flex items-center justify-center p-8">
                <div className="border-2 border-white border-dashed rounded-lg w-full max-w-sm aspect-[3/4] relative opacity-50">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-sm text-center px-4">
                      Position receipt within the frame
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-black">
        <div className="flex items-center justify-center">
          <Button
            onClick={handleCapture}
            disabled={state.isLoading || isCapturing || !state.isActive}
            size="lg"
            className="h-16 w-16 rounded-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-600"
          >
            {isCapturing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        <p className="text-center text-white text-sm mt-4">
          Tap the camera button to capture your receipt
        </p>
      </div>
    </div>
  )
}