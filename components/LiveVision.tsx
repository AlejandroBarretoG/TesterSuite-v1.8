
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Aperture, RefreshCw, Zap, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { runGeminiTests } from '../services/gemini';

export const LiveVision: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (key) setApiKey(key);
    
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setIsCameraActive(true);
      setCapturedImage(null);
      setAnalysisResult(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Permiso denegado. Por favor permite el acceso a la cámara en el navegador.");
      } else if (err.name === 'NotFoundError') {
        setErrorMsg("No se encontró ninguna cámara.");
      } else {
        setErrorMsg(`Error al acceder a la cámara: ${err.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !apiKey) return;

    // 1. Capture Frame
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(base64);

    // 2. Analyze
    setAnalyzing(true);
    const result = await runGeminiTests.analyzeImage(apiKey, 'gemini-2.5-flash', base64, "Describe detalladamente qué ves en esta imagen. Identifica objetos y colores.");
    
    if (result.success && result.data?.output) {
      setAnalysisResult(result.data.output);
    } else {
      setAnalysisResult("Error al analizar: " + result.message);
    }
    setAnalyzing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Aperture size={28} />
          </div>
          <h2 className="text-2xl font-bold">Live Vision</h2>
        </div>
        <p className="text-teal-100 max-w-2xl">
          Análisis multimodal en tiempo real utilizando la cámara y Gemini 2.5 Flash.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <div className="bg-black rounded-xl overflow-hidden shadow-lg relative aspect-video flex items-center justify-center group">
          {!isCameraActive && !capturedImage && (
            <div className="text-center p-6">
              <Camera size={48} className="text-slate-700 mx-auto mb-4" />
              {errorMsg ? (
                <div className="bg-red-500/20 text-red-200 p-3 rounded-lg border border-red-500/50 mb-4 max-w-xs mx-auto text-sm">
                  {errorMsg}
                </div>
              ) : null}
              <button 
                onClick={startCamera}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full transition-all"
              >
                Activar Cámara
              </button>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
          />
          
          {capturedImage && !isCameraActive && (
             <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Controls Overlay */}
          {isCameraActive && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
               <button 
                 onClick={captureAndAnalyze}
                 disabled={analyzing}
                 className="p-4 bg-white rounded-full shadow-xl hover:scale-110 transition-transform disabled:opacity-50"
                 title="Capturar y Analizar"
               >
                 {analyzing ? <RefreshCw className="animate-spin text-teal-600" /> : <div className="w-6 h-6 bg-teal-600 rounded-full border-2 border-white ring-2 ring-teal-600" />}
               </button>
               <button 
                 onClick={stopCamera}
                 className="p-4 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-xl backdrop-blur-sm transition-colors"
                 title="Detener Cámara"
               >
                 <Zap size={24} />
               </button>
             </div>
          )}
          
          {capturedImage && !isCameraActive && (
             <button 
               onClick={() => { setCapturedImage(null); setAnalysisResult(null); startCamera(); }}
               className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full hover:bg-black/70 backdrop-blur-sm text-sm"
             >
               Nueva Captura
             </button>
          )}
        </div>

        {/* Analysis Result */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[300px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Zap size={18} className="text-teal-500" /> Análisis de IA
            </h3>
            {!apiKey && (
              <span className="text-xs text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                <AlertCircle size={12}/> Falta API Key
              </span>
            )}
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
             {analyzing ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                 <RefreshCw size={32} className="animate-spin text-teal-500" />
                 <p className="animate-pulse">Analizando fotograma...</p>
               </div>
             ) : analysisResult ? (
               <div className="prose prose-sm text-slate-700">
                 <p className="leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                 <ImageIcon size={48} className="opacity-20" />
                 <p className="text-sm">Captura una imagen para ver el análisis aquí.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
