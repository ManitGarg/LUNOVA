import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Eye, Upload, Camera, RotateCcw, Check, X,
  Cpu, Sparkles, MapPin, AlertCircle
} from 'lucide-react';

interface Props {
  onBarrierCreated?: () => void;
}

export const VisionScanView: React.FC<Props> = ({ onBarrierCreated }) => {
  const [samples, setSamples] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [manualHint, setManualHint] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load sample test cases
  useEffect(() => {
    api.getSampleFixtures()
      .then(setSamples)
      .catch((err) => console.error('Failed to load sample fixtures:', err));
  }, []);

  // Cleanup camera tracks on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, []);

  // Helper to safely stop all media tracks
  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera
  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    setCapturedBlob(null);
    setCapturedPhotoUrl(null);

    // Verify browser support for MediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment. Please use the file upload option.');
      return;
    }

    setIsCameraOpen(true);
    setCameraStarting(true);

    try {
      // Prefer rear/environment camera on mobile; fallback to default
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      stopCameraTracks();
      setIsCameraOpen(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please grant permission in your browser or select an image file instead.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on your device. Please use the file upload option.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Unknown error'}.`);
      }
    } finally {
      setCameraStarting(false);
    }
  };

  // Close Camera
  const handleCancelCamera = () => {
    stopCameraTracks();
    setIsCameraOpen(false);
    setCapturedBlob(null);
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    setCameraError(null);
  };

  // Capture Photo frame to canvas
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        // Stop active camera stream now that frame is captured
        stopCameraTracks();
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPhotoUrl(url);
      }
    }, 'image/jpeg', 0.92);
  };

  // Retake Photo
  const handleRetakePhoto = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    setCapturedBlob(null);
    handleStartCamera();
  };

  // Use Captured Photo in VisionScan
  const handleUseCapturedPhoto = () => {
    if (!capturedBlob || !capturedPhotoUrl) return;
    const photoFile = new File([capturedBlob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedFile(photoFile);
    setPreviewUrl(capturedPhotoUrl);
    setIsCameraOpen(false);
    setCapturedBlob(null);
    setCapturedPhotoUrl(null);
    setAnalysisResult(null);

    // Run inference immediately on captured photo
    runInference(photoFile);
  };

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setErrorMsg(null);
    }
  };

  // 1-Click benchmark selector
  const handleSelectSample = async (sampleKey: string) => {
    const s = samples[sampleKey];
    if (!s) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewUrl(`/demo_assets/${s.filename}`);

    try {
      const response = await fetch(`/demo_assets/${s.filename}`);
      if (!response.ok) {
        throw new Error(`Demo asset ${s.filename} not found (${response.status})`);
      }
      const blob = await response.blob();
      const file = new File([blob], s.filename, { type: 'image/jpeg' });
      setSelectedFile(file);
      runInference(file, s.category);
    } catch (err: any) {
      setErrorMsg(`Failed to load benchmark fixture: ${err.message || 'Asset not found'}`);
    }
  };

  // Run VisionScan inference
  const runInference = async (fileToScan?: File, hint?: string) => {
    const file = fileToScan || selectedFile;
    if (!file) {
      setErrorMsg('Please select, capture, or upload an image first.');
      return;
    }
    setAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await api.analyzeImage(file, hint || manualHint || undefined);
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed. Check backend connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Link detected obstacle to RealityPulse audit feed
  const linkBarrierToNetwork = async () => {
    if (!analysisResult) return;
    try {
      await api.createReport({
        category: analysisResult.category,
        severity: analysisResult.severity,
        lat: -37.8164,
        lon: 144.9678,
        description: `VisionScan feature match: ${analysisResult.details || analysisResult.category}`,
        image_url: previewUrl || undefined
      });
      setSuccessMsg('Barrier registered to RealityPulse audit feed! Review in RealityPulse tab.');
      if (onBarrierCreated) onBarrierCreated();
    } catch (err: any) {
      setErrorMsg('Failed to link barrier: ' + err.message);
    }
  };

  return (
    <div className="vision-scan-grid">
      {/* Left Column: Image Selector, Camera, & Controls */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} color="#06b6d4" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              VisionScan: Street Barrier Detection
            </h3>
          </div>
          <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
            Image-Feature Analysis
          </span>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.45' }}>
          Capture or upload street-level imagery to assess steps, unramped curbs, surface fractures, and walkway blockages using structural edge and striation analysis.
        </p>

        {/* 1-Click Benchmark Test Cases */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
            1-Click Benchmark Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {Object.entries(samples).map(([key, s]) => (
              <button
                key={key}
                onClick={() => handleSelectSample(key)}
                className="btn-secondary"
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: '#091224'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{s.name}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {s.category.replace(/_/g, ' ')} • <span style={{ color: '#f87171' }}>{s.severity}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Error Message */}
        {cameraError && (
          <div style={{ color: '#f87171', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Live Camera Viewfinder Modal / Section */}
        {isCameraOpen ? (
          <div
            style={{
              background: '#070d18',
              borderRadius: '10px',
              border: '2px solid #06b6d4',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} />
                <span>{capturedPhotoUrl ? 'Review Captured Photo' : 'Live Camera Viewfinder'}</span>
              </div>
              <button
                onClick={handleCancelCamera}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                title="Cancel camera"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Viewfinder or Captured Preview */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                background: '#000000',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured snapshot"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Camera Controls */}
            {capturedPhotoUrl ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleRetakePhoto}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                >
                  <RotateCcw size={14} />
                  Retake Photo
                </button>
                <button
                  onClick={handleUseCapturedPhoto}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                >
                  <Check size={14} />
                  Use Photo for VisionScan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCancelCamera}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCapturePhoto}
                  disabled={cameraStarting}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', fontSize: '12px' }}
                >
                  <Camera size={16} />
                  Capture Photo
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Dual Input Option: Take Photo or Upload Image */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Take Photo Button */}
            <button
              onClick={handleStartCamera}
              className="btn-secondary"
              style={{
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px',
                border: '1px solid #1e293b',
                background: '#070d18'
              }}
            >
              <Camera size={24} color="#06b6d4" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Take Photo</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Live camera capture</div>
            </button>

            {/* Upload File Box */}
            <div
              style={{
                border: '1px dashed #1e293b',
                borderRadius: '10px',
                padding: '16px 12px',
                textAlign: 'center',
                background: '#070d18',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={() => document.getElementById('vision-file-input')?.click()}
            >
              <input
                id="vision-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={24} color="#06b6d4" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Upload Image</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>JPG, PNG up to 10MB</div>
            </div>
          </div>
        )}

        {/* Selected File Indicator */}
        {selectedFile && !isCameraOpen && (
          <div style={{ fontSize: '11px', color: '#38bdf8', background: '#091224', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1a2744' }}>
            Active Image: <b>{selectedFile.name}</b> ({(selectedFile.size / 1024).toFixed(1)} KB)
          </div>
        )}

        {/* Manual Classification Assist */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            Category Assist:
          </label>
          <select
            value={manualHint}
            onChange={(e) => setManualHint(e.target.value)}
            style={{
              flex: 1,
              background: '#091224',
              color: '#f8fafc',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '6px',
              fontSize: '11px'
            }}
          >
            <option value="">-- Automated Feature Extraction --</option>
            <option value="STAIRS_OR_STEPS">Stairs & Steps</option>
            <option value="MISSING_KERB_RAMP">Missing Kerb Ramp</option>
            <option value="BROKEN_UNEVEN_SURFACE">Broken / Uneven Surface</option>
            <option value="POLE_OR_OBSTRUCTION">Pole / Vertical Obstruction</option>
            <option value="PARKED_VEHICLE_BLOCKING_PATH">Parked Vehicle Blocking Path</option>
            <option value="NARROW_PASSAGE">Narrow Corridor / Encroachment</option>
          </select>
        </div>

        <button
          onClick={() => runInference()}
          disabled={!selectedFile || analyzing}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
        >
          {analyzing ? (
            <>
              <Cpu size={18} className="animate-spin" />
              Analyzing Edge Density & Gradient Striations...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Run VisionScan Analysis
            </>
          )}
        </button>

        {errorMsg && (
          <div style={{ color: '#f87171', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ color: '#34d399', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {successMsg}
          </div>
        )}
      </div>

      {/* Right Column: Visual Preview & Bounding Box & Inference Output */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Detection Canvas & Feature Analysis
        </h4>

        {/* Image Preview with Bounding Box Overlay */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '280px',
            background: '#070d18',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Scan Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Bounding Box Overlay */}
              {analysisResult && analysisResult.bbox && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${analysisResult.bbox[0] * 100}%`,
                    left: `${analysisResult.bbox[1] * 100}%`,
                    height: `${(analysisResult.bbox[2] - analysisResult.bbox[0]) * 100}%`,
                    width: `${(analysisResult.bbox[3] - analysisResult.bbox[1]) * 100}%`,
                    border: '2px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.2)',
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
                    borderRadius: '4px',
                    pointerEvents: 'none'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '0',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '3px'
                    }}
                  >
                    {analysisResult.category} ({(analysisResult.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <Eye size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontSize: '13px' }}>No image loaded</div>
              <div style={{ fontSize: '11px' }}>Take a photo, upload an image, or click a preset</div>
            </div>
          )}
        </div>

        {/* Structured Results Panel */}
        {analysisResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                background: '#091224',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #1a2744',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Feature Match</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  {analysisResult.category.replace(/_/g, ' ')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={analysisResult.severity === 'CRITICAL' ? 'badge-barrier' : 'badge-warning'}>
                  {analysisResult.severity} SEVERITY
                </span>
                <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px', fontWeight: 700 }}>
                  {(analysisResult.confidence * 100).toFixed(0)}% Score
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.45', background: '#070d18', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <b>Analysis Detail:</b> {analysisResult.details}
            </div>

            {/* Visual Metrics Breakdown */}
            {analysisResult.visual_metrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                <div style={{ background: '#091224', padding: '6px 8px', borderRadius: '4px' }}>
                  Edge Density: <b style={{ color: '#f8fafc' }}>{analysisResult.visual_metrics.edge_density}</b>
                </div>
                <div style={{ background: '#091224', padding: '6px 8px', borderRadius: '4px' }}>
                  Striations: <b style={{ color: '#f8fafc' }}>{analysisResult.visual_metrics.horizontal_striation_count}</b>
                </div>
                <div style={{ background: '#091224', padding: '6px 8px', borderRadius: '4px' }}>
                  Variance: <b style={{ color: '#f8fafc' }}>{analysisResult.visual_metrics.texture_variance}</b>
                </div>
              </div>
            )}

            {/* Honest Methodology Statement (Task 4) */}
            <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
              Method: <b>{analysisResult.detection_source}</b> (Pillow-based structural edge and gradient feature analysis). Detects repetitive step risers and surface fractures; manual confirmation recommended before updating trusted navigation graphs.
            </div>

            <button
              onClick={linkBarrierToNetwork}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '8px', fontSize: '12px' }}
            >
              <MapPin size={14} />
              Submit to RealityPulse Verification Queue
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            Inference metrics and bounding box will appear here after analysis.
          </div>
        )}
      </div>
    </div>
  );
};
