import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import './VideoPreview.css';

export interface VideoPreviewHandle {
  stopStream: () => void;
}

interface VideoPreviewProps {
  disabled?: boolean;
}

const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(({ disabled = false }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    stopStream
  }));

  useEffect(() => {
    if (disabled) {
      stopStream();
      return;
    }

    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
      } catch (err: any) {
        setError('Failed to access camera/microphone. Please grant permissions.');
        console.error('Error accessing media devices:', err);
      }
    };

    getMedia();

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <div className="video-preview-container">
      {error ? (
        <div className="video-error">{error}</div>
      ) : disabled ? (
        <div className="video-error">Camera stopped</div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video-preview"
        />
      )}
    </div>
  );
});

VideoPreview.displayName = 'VideoPreview';

export default VideoPreview;

