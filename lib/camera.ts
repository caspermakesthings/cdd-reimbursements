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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new CameraError(
      'Camera API not supported in this browser',
      'CAMERA_NOT_SUPPORTED'
    );
  }

  // Build constraints with fallbacks
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: constraints.width || 1280, max: 1920 },
    height: { ideal: constraints.height || 720, max: 1080 },
    facingMode: constraints.facingMode || 'environment'
  };

  const streamConstraints: MediaStreamConstraints = {
    video: videoConstraints,
    audio: false
  };

  try {
    console.log('Attempting camera access with constraints:', streamConstraints);
    const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    
    // Verify we got a valid stream
    if (!stream || !stream.active) {
      throw new Error('Received inactive stream');
    }
    
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('No video tracks in stream');
    }
    
    console.log('Camera access successful:', {
      streamId: stream.id,
      active: stream.active,
      videoTracks: videoTracks.length,
      settings: videoTracks[0].getSettings()
    });
    
    return stream;
  } catch (error: any) {
    console.error('Camera access error:', error);
    
    let message = 'Failed to access camera';
    let code = 'CAMERA_ACCESS_FAILED';

    switch (error.name) {
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
        // Try with more relaxed constraints
        console.log('Constraints too strict, trying with relaxed constraints');
        try {
          const relaxedConstraints: MediaStreamConstraints = {
            video: {
              facingMode: constraints.facingMode || 'environment'
            },
            audio: false
          };
          const fallbackStream = await navigator.mediaDevices.getUserMedia(relaxedConstraints);
          console.log('Fallback camera access successful');
          return fallbackStream;
        } catch (fallbackError) {
          message = 'Camera does not support the required quality. Please try a different camera.';
          code = 'CONSTRAINTS_NOT_SATISFIED';
        }
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
        if (error.message) {
          message = `Camera error: ${error.message}`;
        }
    }

    throw new CameraError(message, code, error);
  }
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