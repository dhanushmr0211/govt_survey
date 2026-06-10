import { useState, useEffect, useRef } from 'react';
import { Camera, RotateCw, X, AlertTriangle } from 'lucide-react';

export const InAppCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [isInitializing, setIsInitializing] = useState(true);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [zoomValue, setZoomValue] = useState(1);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setIsInitializing(true);
    setError(null);
    setZoomSupported(false);
    setZoomRange({ min: 1, max: 1, step: 0.1 });
    setZoomValue(1);
    stopCamera();

    const constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
          if (capabilities.zoom) {
            setZoomSupported(true);
            setZoomRange({
              min: capabilities.zoom.min || 1,
              max: capabilities.zoom.max || 1,
              step: capabilities.zoom.step || 0.1,
            });
            const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
            setZoomValue(settings.zoom || capabilities.zoom.min || 1);
          }
        } catch (e) {
          console.warn('Failed to get track capabilities:', e);
        }
      }
      setIsInitializing(false);
    } catch (err) {
      console.error('Failed to access camera with facingMode:', facingMode, err);
      
      // Fallback: try without facingMode restriction (might open front camera)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            if (capabilities.zoom) {
              setZoomSupported(true);
              setZoomRange({
                min: capabilities.zoom.min || 1,
                max: capabilities.zoom.max || 1,
                step: capabilities.zoom.step || 0.1,
              });
              const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
              setZoomValue(settings.zoom || capabilities.zoom.min || 1);
            }
          } catch (e) {
            console.warn('Failed to get track capabilities in fallback:', e);
          }
        }
        setIsInitializing(false);
      } catch (fallbackErr) {
        console.error('All camera access options failed:', fallbackErr);
        setError('Could not access camera. Please ensure permissions are granted.');
        setIsInitializing(false);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const handleZoomChange = async (e) => {
    const value = parseFloat(e.target.value);
    setZoomValue(value);
    
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
          if (capabilities.zoom) {
            await track.applyConstraints({
              advanced: [{ zoom: value }]
            });
          }
        } catch (err) {
          console.error('Failed to apply zoom constraint:', err);
        }
      }
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Set canvas dimensions to match the actual video stream
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to Blob and then File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const fileName = `capture_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          stopCamera();
          onCapture(file);
        } else {
          setError('Failed to capture image blob.');
        }
      },
      'image/jpeg',
      0.85 // quality
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center z-10 text-white">
        <h3 className="text-sm font-semibold tracking-wide">In-App Camera</h3>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Area (Video / Error / Loader) */}
      <div className="flex-1 flex items-center justify-center relative my-4 rounded-xl overflow-hidden bg-slate-900 border border-white/5 shadow-inner">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
            <p className="text-xs">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center gap-2">
            <AlertTriangle size={36} />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={startCamera}
              className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isInitializing || error ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        />

        {/* Zoom Control Overlay */}
        {!isInitializing && !error && zoomSupported && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-[280px] bg-slate-950/75 backdrop-blur-md py-2 px-4 rounded-full flex items-center gap-3 border border-white/10 shadow-lg z-20">
            <span className="text-[11px] font-bold text-white/50 select-none">1x</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoomValue}
              onChange={handleZoomChange}
              className="flex-1 accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[11px] font-bold text-white select-none min-w-[32px] text-right">
              {zoomValue.toFixed(1)}x
            </span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-around items-center py-4 z-10 text-white">
        <button
          onClick={toggleCamera}
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
          title="Switch Camera"
        >
          <RotateCw size={24} />
        </button>

        <button
          onClick={handleCapture}
          disabled={isInitializing || !!error}
          className="w-20 h-20 rounded-full border-4 border-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
          title="Capture"
        >
          <div className="w-16 h-16 rounded-full border-2 border-slate-950 bg-white hover:bg-slate-100 flex items-center justify-center">
            <Camera size={28} className="text-slate-900" />
          </div>
        </button>

        <div className="w-14"></div> {/* spacer for layout symmetry */}
      </div>
    </div>
  );
};
