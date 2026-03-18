/**
 * WebcamCapture Component
 * Real-time webcam face capture with animated face mesh overlay
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Camera, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import './WebcamCapture.css';

interface WebcamCaptureProps {
  onCapture: (imageFile: File) => void;
  onCancel?: () => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onCancel }) => {
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'captured' | 'error'>('requesting');
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Initialize webcam stream
   */
  const initializeWebcam = useCallback(async () => {
    try {
      setCameraState('requesting');
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load, then play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraState('active');
          }).catch((err) => {
            console.error('Video play failed:', err);
            setError('Failed to play video stream');
            setCameraState('error');
          });
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to access camera';
      console.error('Camera error:', msg);
      setError(msg.includes('NotAllowed')
        ? 'Camera access denied. Please enable camera permissions in your browser settings.'
        : msg
      );
      setCameraState('error');
    }
  }, []);

  /**
   * Stop webcam stream
   */
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Capture current frame from video
   */
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the capture to match the mirrored video preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image as data URL for preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Convert to file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
          // Stop webcam
          stopWebcam();
          setCameraState('captured');
          // Pass file to parent after a short delay for UI feedback
          setTimeout(() => {
            onCapture(file);
          }, 1500);
        }
      },
      'image/jpeg',
      0.92
    );
  }, [onCapture, stopWebcam]);

  /**
   * Reset and retake
   */
  const retake = useCallback(() => {
    setCapturedImage(null);
    setCameraState('requesting');
    initializeWebcam();
  }, [initializeWebcam]);

  /**
   * Auto-initialize on mount, cleanup on unmount
   */
  useEffect(() => {
    initializeWebcam();
    return () => {
      stopWebcam();
    };
  }, [initializeWebcam, stopWebcam]);

  // ===== RENDER =====
  return (
    <div className="webcam-capture">
      {/* Header */}
      <div className="webcam-header">
        <h2>Capture Your Face</h2>
        <button className="close-btn" onClick={onCancel} aria-label="Close camera">
          <X size={20} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Error retry */}
      {cameraState === 'error' && (
        <div className="permission-denied">
          <Camera size={48} />
          <h3>Camera Issue</h3>
          <p>{error || 'Something went wrong'}</p>
          <Button onClick={retake} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {cameraState === 'requesting' && !error && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Starting camera...</p>
        </div>
      )}

      {/* Camera Preview - always render video so ref is available */}
      <div
        className="camera-container"
        style={{ display: (cameraState === 'active') ? 'block' : 'none' }}
      >
        {/* Framing Guide */}
        <div className="framing-guide" />

        {/* Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-stream"
        />

        {/* Status Text */}
        <div className="status-text">
          Position your face inside the frame
        </div>

        {/* Capture Button */}
        <button className="capture-btn" onClick={captureFrame}>
          <Camera size={24} />
          <span>Capture Photo</span>
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Captured State */}
      {cameraState === 'captured' && capturedImage && (
        <div className="analysis-container">
          <div className="captured-image-wrapper">
            <img
              src={capturedImage}
              alt="Captured face"
              className="captured-image"
            />
            <div className="analysis-indicator">
              <div className="pulse-ring" />
              <p className="analysis-text">Analyzing your face...</p>
            </div>
          </div>
          <div className="action-buttons">
            <Button onClick={retake} variant="outline" className="retry-btn">
              <RotateCcw size={18} />
              Retake Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
