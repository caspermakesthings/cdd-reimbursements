'use client';

// Debug utilities for camera issues
export async function debugCameraAccess() {
  console.log('=== Camera Debug Information ===');
  
  // Check basic support
  console.log('Navigator media devices:', !!navigator.mediaDevices);
  console.log('getUserMedia support:', !!navigator.mediaDevices?.getUserMedia);
  
  if (!navigator.mediaDevices?.getUserMedia) {
    console.log('❌ getUserMedia not supported');
    return;
  }
  
  try {
    // List available devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    console.log('Available video devices:', videoDevices.length);
    videoDevices.forEach((device, i) => {
      console.log(`Device ${i}:`, {
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind
      });
    });
    
    // Try basic camera access
    console.log('Attempting basic camera access...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    
    console.log('✅ Basic camera access successful');
    console.log('Stream details:', {
      id: stream.id,
      active: stream.active,
      tracks: stream.getTracks().length
    });
    
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const track = videoTracks[0];
      console.log('Video track details:', {
        id: track.id,
        kind: track.kind,
        label: track.label,
        readyState: track.readyState,
        enabled: track.enabled,
        settings: track.getSettings(),
        capabilities: track.getCapabilities()
      });
    }
    
    // Test video element assignment
    const testVideo = document.createElement('video');
    testVideo.autoplay = true;
    testVideo.muted = true;
    testVideo.playsInline = true;
    testVideo.srcObject = stream;
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video test timeout'));
      }, 5000);
      
      testVideo.onloadedmetadata = () => {
        console.log('✅ Test video metadata loaded:', {
          videoWidth: testVideo.videoWidth,
          videoHeight: testVideo.videoHeight,
          readyState: testVideo.readyState
        });
        clearTimeout(timeout);
        resolve();
      };
      
      testVideo.onerror = (e) => {
        console.log('❌ Test video error:', e);
        clearTimeout(timeout);
        reject(e);
      };
    });
    
    // Cleanup
    stream.getTracks().forEach(track => track.stop());
    
    console.log('=== Camera Debug Complete ===');
    return true;
    
  } catch (error) {
    console.log('❌ Camera debug failed:', error);
    return false;
  }
}