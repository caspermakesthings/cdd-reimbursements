export interface CameraConstraints {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export class CameraError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

export async function checkCameraSupport(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
}

export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        kind: device.kind
      }));
  } catch (error) {
    throw new CameraError(
      'Failed to enumerate camera devices',
      'DEVICE_ENUMERATION_FAILED',
      error as Error
    );
  }
}

export async function requestCameraAccess(
  constraints: CameraConstraints = {}
): Promise<MediaStream> {
  // Check for HTTPS requirement (except localhost)
  if (location.protocol !== 'https:' && !location.hostname.includes('localhost') && location.hostname !== '127.0.0.1') {
    throw new CameraError(
      'Camera access requires HTTPS or localhost',
      'HTTPS_REQUIRED'
    );
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new CameraError(
      'Camera API not supported in this browser',
      'CAMERA_NOT_SUPPORTED'
    );
  }

  // Build constraints with fallbacks - be more lenient initially
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: constraints.width || 1280 },
    height: { ideal: constraints.height || 720 },
    facingMode: constraints.facingMode || 'environment'
  };

  const streamConstraints: MediaStreamConstraints = {
    video: videoConstraints,
    audio: false
  };

  // Try progressive fallback approach
  const fallbackConstraints = [
    streamConstraints, // Original constraints
    { video: { facingMode: constraints.facingMode || 'environment' }, audio: false }, // Just facing mode
    { video: true, audio: false }, // Most basic
  ];
  
  let lastError: any;
  
  for (let i = 0; i < fallbackConstraints.length; i++) {
    const currentConstraints = fallbackConstraints[i];
    console.log(`Attempting camera access (attempt ${i + 1}/${fallbackConstraints.length}):`, currentConstraints);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(currentConstraints);
      
      // Verify we got a valid stream
      if (!stream || !stream.active) {
        throw new Error('Received inactive stream');
      }
      
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks in stream');
      }
      
      const firstTrack = videoTracks[0];
      const settings = firstTrack.getSettings();
      
      console.log(`✅ Camera access successful (attempt ${i + 1}):`, {
        streamId: stream.id,
        active: stream.active,
        videoTracks: videoTracks.length,
        trackState: firstTrack.readyState,
        trackEnabled: firstTrack.enabled,
        settings: settings
      });
      
      return stream;
    } catch (error: any) {
      console.log(`❌ Camera attempt ${i + 1} failed:`, error);
      lastError = error;
      
      // For certain errors, don't try fallbacks
      if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
        break;
      }
      
      continue;
    }
  }
  
  // If we get here, all attempts failed
  console.error('All camera access attempts failed. Last error:', lastError);
  
  let message = 'Failed to access camera';
  let code = 'CAMERA_ACCESS_FAILED';
  
  if (lastError) {
    switch (lastError.name) {
      case 'NotAllowedError':
        message = 'Camera access denied. Please allow camera permissions and try again.';
        code = 'PERMISSION_DENIED';
        break;
      case 'NotFoundError':
        message = 'No camera found on this device.';
        code = 'NO_CAMERA_FOUND';
        break;
      case 'NotReadableError':
        message = 'Camera is already in use by another application.';
        code = 'CAMERA_IN_USE';
        break;
      case 'OverconstrainedError':
        message = 'Camera does not support the required quality. Please try a different camera.';
        code = 'CONSTRAINTS_NOT_SATISFIED';
        break;
      case 'SecurityError':
        message = 'Camera access blocked due to security restrictions. Please use HTTPS.';
        code = 'SECURITY_ERROR';
        break;
      case 'AbortError':
        message = 'Camera access was cancelled.';
        code = 'ACCESS_CANCELLED';
        break;
      default:
        if (lastError.message) {
          message = `Camera error: ${lastError.message}`;
        }
    }
  }
  
  throw new CameraError(message, code, lastError);
}

export function stopCameraStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => {
    track.stop();
  });
}

export async function captureImageFromVideo(
  videoElement: HTMLVideoElement,
  quality: number = 0.8
): Promise<File> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new CameraError('Failed to create canvas context', 'CANVAS_CONTEXT_FAILED');
  }

  // Set canvas size to match video
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  // Draw the current video frame to canvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new CameraError('Failed to capture image', 'CAPTURE_FAILED'));
          return;
        }

        // Create File from blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `receipt-scan-${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve(file);
      },
      'image/jpeg',
      quality
    );
  });
}