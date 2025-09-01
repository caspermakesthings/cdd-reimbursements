'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  checkCameraSupport, 
  requestCameraAccess, 
  stopCameraStream, 
  captureImageFromVideo,
  getCameraDevices,
  CameraError,
  type CameraDevice,
  type CameraConstraints 
} from '@/lib/camera';

export interface UseCameraState {
  isSupported: boolean;
  isLoading: boolean;
  isActive: boolean;
  error: string | null;
  devices: CameraDevice[];
  currentDeviceId?: string;
}

export interface UseCameraActions {
  startCamera: (constraints?: CameraConstraints) => Promise<void>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  captureImage: () => Promise<File>;
  clearError: () => void;
}

export interface UseCamera {
  state: UseCameraState;
  actions: UseCameraActions;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [state, setState] = useState<UseCameraState>({
    isSupported: false,
    isLoading: false,
    isActive: false,
    error: null,
    devices: [],
    currentDeviceId: undefined
  });

  // Check camera support on mount
  useEffect(() => {
    checkCameraSupport().then(supported => {
      setState(prev => ({ ...prev, isSupported: supported }));
      
      if (supported) {
        // Load available devices
        getCameraDevices()
          .then(devices => {
            setState(prev => ({ ...prev, devices }));
          })
          .catch(error => {
            console.warn('Could not enumerate camera devices:', error);
          });
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
      }
    };
  }, []);

  const startCamera = useCallback(async (constraints: CameraConstraints = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Stop existing stream if any
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
      }

      const stream = await requestCameraAccess(constraints);
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          const handleLoadedData = () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (event: Event) => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('error', handleError);
            reject(new Error('Failed to load video stream'));
          };

          video.addEventListener('loadeddata', handleLoadedData);
          video.addEventListener('error', handleError);
          
          video.play().catch(reject);
        });
      }

      // Get the actual device being used
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isActive: true,
        currentDeviceId: settings.deviceId,
        error: null
      }));
    } catch (error) {
      console.error('Camera start error:', error);
      
      let errorMessage = 'Failed to start camera';
      if (error instanceof CameraError) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isActive: false,
        error: errorMessage
      }));
      
      throw error;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      currentDeviceId: undefined,
      error: null
    }));
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (!state.isActive) {
      throw new Error('Camera is not active');
    }

    await startCamera({ 
      width: 1920, 
      height: 1080,
      // Use specific device
      ...(deviceId && { deviceId: { exact: deviceId } })
    } as any);
  }, [state.isActive, startCamera]);

  const captureImage = useCallback(async (): Promise<File> => {
    if (!videoRef.current || !state.isActive) {
      throw new Error('Camera is not active');
    }

    try {
      const file = await captureImageFromVideo(videoRef.current, 0.9);
      return file;
    } catch (error) {
      console.error('Image capture error:', error);
      throw error;
    }
  }, [state.isActive]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    actions: {
      startCamera,
      stopCamera,
      switchCamera,
      captureImage,
      clearError
    },
    videoRef
  };
}