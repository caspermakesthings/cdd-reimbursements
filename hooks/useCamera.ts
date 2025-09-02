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
        streamRef.current = null;
      }

      console.log('Requesting camera access with constraints:', constraints);
      const stream = await requestCameraAccess(constraints);
      console.log('Camera stream received:', stream);
      
      // Verify stream is active
      if (!stream || !stream.active) {
        throw new Error('Camera stream is not active');
      }
      
      streamRef.current = stream;

      // Attach stream to video element with improved handling
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing source
        video.srcObject = null;
        
        // Set up the new stream
        video.srcObject = stream;
        
        // Wait for video to be ready with multiple fallbacks
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Video loading timeout - camera may be in use'));
          }, 10000); // 10 second timeout
          
          let resolved = false;
          
          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
          };
          
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              cleanup();
              console.log('Video ready for capture');
              resolve();
            }
          };
          
          const handleLoadedMetadata = () => {
            console.log('Video metadata loaded');
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              resolveOnce();
            }
          };
          
          const handleLoadedData = () => {
            console.log('Video data loaded');
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
              resolveOnce();
            }
          };
          
          const handleCanPlay = () => {
            console.log('Video can play');
            resolveOnce();
          };
          
          const handleError = (event: Event) => {
            console.error('Video load error:', event);
            cleanup();
            if (!resolved) {
              resolved = true;
              reject(new Error('Failed to load video stream'));
            }
          };

          // Add multiple event listeners for different browsers
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('loadeddata', handleLoadedData);
          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
          
          // Start playing
          video.play().then(() => {
            console.log('Video started playing');
            // Some browsers resolve immediately, others need more time
            if (video.readyState >= 2 && video.videoWidth > 0) {
              resolveOnce();
            }
          }).catch((playError) => {
            console.error('Video play error:', playError);
            cleanup();
            if (!resolved) {
              resolved = true;
              reject(new Error(`Failed to play video: ${playError.message}`));
            }
          });
          
          // Immediate check in case video is already ready
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            resolveOnce();
          }
        });
      } else {
        throw new Error('Video element not available');
      }

      // Get the actual device being used
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found in stream');
      }
      
      const settings = videoTrack.getSettings();
      console.log('Camera settings:', settings);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isActive: true,
        currentDeviceId: settings.deviceId,
        error: null
      }));
    } catch (error: any) {
      console.error('Camera start error:', error);
      
      // Clean up on error
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      let errorMessage = 'Failed to start camera';
      if (error instanceof CameraError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
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