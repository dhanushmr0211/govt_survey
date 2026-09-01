import { useState, useEffect, useRef } from 'react';
import { Camera, RotateCw, X, AlertTriangle } from 'lucide-react';

export const InAppCamera = ({ onCapture, onClose, poleNumber, wardNumber, ccmsNumber }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isInitializing, setIsInitializing] = useState(true);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [zoomValue, setZoomValue] = useState(1);
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(1);
  const containerRef = useRef(null);
  const zoomValueRef = useRef(1);
  const zoomRangeRef = useRef({ min: 1, max: 1, step: 0.1 });
  const activeInitRef = useRef(0);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    const initId = ++activeInitRef.current;
    setIsInitializing(true);
    setError(null);
    setZoomSupported(false);
    setZoomRange({ min: 1, max: 1, step: 0.1 });
    setZoomValue(1);
    stopCamera();

    const constraints = {
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    };

    const applyZoomCapabilities = (stream) => {
      const track = stream.getVideoTracks()[0];
      if (!track) return;
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
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (initId !== activeInitRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      applyZoomCapabilities(stream);
      setIsInitializing(false);
    } catch (err) {
      if (initId !== activeInitRef.current) return;
      console.error('Failed to access camera with facingMode:', facingMode, err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (initId !== activeInitRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        applyZoomCapabilities(stream);
        setIsInitializing(false);
      } catch (fallbackErr) {
        if (initId !== activeInitRef.current) return;
        console.error('All camera access options failed:', fallbackErr);
        setIsInitializing(false);
        alert('Camera permission is blocked or denied.\n\nTo take photos, please allow camera access by clicking the lock/settings icon next to the website address in your browser address bar, then click "Take Photo" again.');
        onClose();
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => { activeInitRef.current = 0; stopCamera(); };
  }, [facingMode]);

  useEffect(() => {
    const statePushed = { modalOpen: 'in-app-camera' };
    window.history.pushState(statePushed, '');
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state && window.history.state.modalOpen === 'in-app-camera') {
        window.history.back();
      }
    };
  }, [onClose]);

  useEffect(() => { zoomValueRef.current = zoomValue; }, [zoomValue]);
  useEffect(() => { zoomRangeRef.current = zoomRange; }, [zoomRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2 && zoomSupported) {
        if (e.cancelable) e.preventDefault();
        touchStartDistRef.current = getDistance(e.touches[0], e.touches[1]);
        touchStartZoomRef.current = zoomValueRef.current;
      }
    };

    const onTouchMove = async (e) => {
      if (e.touches.length === 2 && zoomSupported && touchStartDistRef.current > 0) {
        if (e.cancelable) e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const factor = dist / touchStartDistRef.current;
        let targetZoom = touchStartZoomRef.current * factor;
        const currentRange = zoomRangeRef.current;
        const step = currentRange.step || 0.1;
        targetZoom = Math.round(targetZoom / step) * step;
        targetZoom = Math.max(currentRange.min, Math.min(currentRange.max, targetZoom));
        setZoomValue(targetZoom);
        if (streamRef.current) {
          const track = streamRef.current.getVideoTracks()[0];
          if (track) {
            try { await track.applyConstraints({ advanced: [{ zoom: targetZoom }] }); }
            catch (err) { console.error('Failed to apply pinch zoom constraint:', err); }
          }
        }
      }
    };

    const onTouchEnd = () => { touchStartDistRef.current = 0; };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomSupported]);

  // ─── Watermark helpers ────────────────────────────────────────────────────

  /** Get live GPS coords at capture time. Resolves in max 4 s; never rejects. */
  const getLiveGps = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ lat: null, lng: null }); return; }
      const timer = setTimeout(() => resolve({ lat: null, lng: null }), 4000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({
            lat: pos.coords.latitude.toFixed(5),
            lng: pos.coords.longitude.toFixed(5),
          });
        },
        () => { clearTimeout(timer); resolve({ lat: null, lng: null }); },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 10000 }
      );
    });

  /** Draw a bottom-left watermark box on the canvas 2D context. */
  const drawWatermark = (ctx, canvasW, canvasH, lines) => {
    if (!lines.length) return;

    const FONT_SIZE = 16;
    const LINE_H = FONT_SIZE + 6;
    const PAD = 10;       // outer margin from edges
    const BOX_PAD = 8;    // inner padding inside box

    ctx.font = `bold ${FONT_SIZE}px sans-serif`;

    let maxW = 0;
    lines.forEach((l) => { const w = ctx.measureText(l).width; if (w > maxW) maxW = w; });

    const boxW = maxW + BOX_PAD * 2;
    const boxH = lines.length * LINE_H + BOX_PAD * 2;
    const boxX = PAD;
    const boxY = canvasH - boxH - PAD;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // White text with dark stroke for readability on any background
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      const x = boxX + BOX_PAD;
      const y = boxY + BOX_PAD + i * LINE_H;
      ctx.strokeText(line, x, y);
      ctx.fillText(line, x, y);
    });
  };

  // ─── Capture ──────────────────────────────────────────────────────────────

  const handleCapture = async () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw raw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Overlay metadata watermark (only when props are provided — TGPL only)
    const hasMetadata = poleNumber || wardNumber || ccmsNumber;
    if (hasMetadata) {
      const { lat, lng } = await getLiveGps();

      const lines = [];
      if (wardNumber) lines.push(`Ward: ${wardNumber}`);
      if (poleNumber) lines.push(`Pole: ${poleNumber}`);
      if (ccmsNumber) lines.push(`CCMS: ${ccmsNumber}`);
      if (lat !== null && lng !== null) lines.push(`Lat: ${lat}  Lng: ${lng}`);

      drawWatermark(ctx, canvas.width, canvas.height, lines);
    }

    // 3. Export as JPEG File (same flow as before)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopCamera();
          onCapture(file);
        } else {
          setError('Failed to capture image blob.');
        }
      },
      'image/jpeg',
      0.78  // balanced quality — good visual detail at ~300–500 KB on 1080p
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center z-10 text-white">
        <h3 className="text-sm font-semibold tracking-wide">In-App Camera</h3>
        <button
          type="button"
          onClick={() => { stopCamera(); onClose(); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative my-4 rounded-xl overflow-hidden bg-slate-900 border border-white/5 shadow-inner"
      >
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-xs">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center gap-2">
            <AlertTriangle size={36} />
            <p className="text-sm font-medium">{error}</p>
            <button type="button" onClick={startCamera}
              className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20">
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

        {/* Zoom level badge */}
        {!isInitializing && !error && zoomSupported && zoomValue > 1 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/75 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/10 shadow-lg z-20 text-white text-[11px] font-bold tracking-wider select-none">
            {zoomValue.toFixed(1)}x
          </div>
        )}

        {/* Watermark preview badge — mirrors what will be burned onto the image */}
        {!isInitializing && !error && (poleNumber || wardNumber || ccmsNumber) && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-mono px-2 py-1.5 rounded leading-relaxed pointer-events-none select-none border border-white/10">
            {wardNumber && <div>Ward: {wardNumber}</div>}
            {poleNumber && <div>Pole: {poleNumber}</div>}
            {ccmsNumber && <div>CCMS: {ccmsNumber}</div>}
            <div className="text-white/40 mt-0.5">GPS stamped at capture</div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-around items-center py-4 z-10 text-white">
        <button type="button" onClick={toggleCamera}
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
          title="Switch Camera">
          <RotateCw size={24} />
        </button>

        <button type="button" onClick={handleCapture}
          disabled={isInitializing || !!error}
          className="w-20 h-20 rounded-full border-4 border-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
          title="Capture">
          <div className="w-16 h-16 rounded-full border-2 border-slate-950 bg-white hover:bg-slate-100 flex items-center justify-center">
            <Camera size={28} className="text-slate-900" />
          </div>
        </button>

        <div className="w-14" /> {/* spacer */}
      </div>
    </div>
  );
};
