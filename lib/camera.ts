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

  const defaultConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      facingMode: 'environment', // Prefer back camera for documents
      ...constraints
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
    return stream;
  } catch (error: any) {
    let message = 'Failed to access camera';
    let code = 'CAMERA_ACCESS_FAILED';

    switch (error.name) {
      case 'NotAllowedError':
        message = 'Camera access denied. Please allow camera permissions.';
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
        message = 'Camera does not meet the required constraints.';
        code = 'CONSTRAINTS_NOT_SATISFIED';
        break;
      case 'SecurityError':
        message = 'Camera access blocked due to security restrictions.';
        code = 'SECURITY_ERROR';
        break;
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