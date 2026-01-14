
import React, { useState, useRef, useEffect } from 'react';
import { analyzeImage, generateAnimation } from './services/geminiService';
import { AnimationState, PersonaDetails } from './types';

// Components
const CameraCapture: React.FC<{ onCapture: (base64: string) => void }> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stream]);

  if (!stream) {
    return (
      <button 
        onClick={startCamera}
        className="w-full h-64 bg-gray-800 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-600 hover:border-purple-500 transition-colors group"
      >
        <i className="fas fa-camera text-4xl mb-4 text-gray-400 group-hover:text-purple-400"></i>
        <span className="text-gray-400 group-hover:text-purple-400 font-medium">Click to use Camera</span>
      </button>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
      <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4">
        <button 
          onClick={capture}
          className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
        >
          Snap Photo
        </button>
        <button 
          onClick={stopCamera}
          className="bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-red-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AnimationState>({ status: 'idle' });
  const [persona, setPersona] = useState<PersonaDetails | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Check key selection on mount
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio?.hasSelectedApiKey();
      setHasKey(!!selected);
    };
    checkKey();
  }, []);

  const handleKeySelection = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
    setHasKey(true); // Assume success as per instructions
  };

  const processImage = async (base64: string) => {
    setState({ status: 'analyzing', imageUrl: base64 });
    try {
      const analysis = await analyzeImage(base64);
      setPersona(analysis);
      
      setState(prev => ({ ...prev, status: 'generating' }));
      const video = await generateAnimation(base64, analysis.animationPrompt);
      
      setState(prev => ({ ...prev, status: 'completed', videoUrl: video }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, status: 'error', error: err.message || "Something went wrong" }));
    }
  };

  const reset = () => {
    setState({ status: 'idle' });
    setPersona(null);
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 animate-gradient">
        <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 max-w-md w-full text-center shadow-2xl">
          <i className="fas fa-magic text-6xl mb-6 text-purple-400"></i>
          <h1 className="text-3xl font-black mb-4">Magic Animator</h1>
          <p className="text-gray-300 mb-8">To bring your photos to life using Veo 3.1, you need to select a billing-enabled API key.</p>
          <button 
            onClick={handleKeySelection}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
          >
            Select API Key
          </button>
          <p className="mt-4 text-xs text-gray-400">
            Requires a paid project. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">billing docs</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-wand-sparkles text-white"></i>
          </div>
          <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            ANIMATE ME
          </h1>
        </div>
        {state.status !== 'idle' && (
          <button onClick={reset} className="text-gray-400 hover:text-white transition-colors">
            <i className="fas fa-rotate-left mr-2"></i> Reset
          </button>
        )}
      </header>

      <main className="w-full max-w-2xl">
        {state.status === 'idle' && (
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black">Snap it. Bring it to life.</h2>
              <p className="text-gray-400 text-lg">Turn everyday objects into hilarious animated characters.</p>
            </div>
            
            <CameraCapture onCapture={processImage} />
            
            <div className="flex items-center justify-center space-x-4">
              <span className="h-px w-12 bg-gray-700"></span>
              <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">Or upload</span>
              <span className="h-px w-12 bg-gray-700"></span>
            </div>

            <label className="block">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => processImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors inline-block px-10">
                <i className="fas fa-file-arrow-up mr-2"></i> Select from Gallery
              </div>
            </label>
          </div>
        )}

        {(state.status === 'analyzing' || state.status === 'generating') && (
          <div className="flex flex-col items-center space-y-8 animate-pulse">
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-purple-500/50 shadow-2xl">
              <img src={state.imageUrl} alt="Processing" className="w-full h-full object-cover opacity-50 grayscale" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-center p-8">
                  <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="text-2xl font-bold mb-2">
                    {state.status === 'analyzing' ? 'Identifying Soul...' : 'Animating Personality...'}
                  </h3>
                  <p className="text-gray-300">
                    {state.status === 'analyzing' 
                      ? "Studying your object's secret life..." 
                      : `The ${persona?.objectName || 'object'} is learning to move!`}
                  </p>
                  {state.status === 'generating' && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <span className="bg-purple-900/50 px-3 py-1 rounded-full text-xs border border-purple-700">Applying physics...</span>
                      <span className="bg-pink-900/50 px-3 py-1 rounded-full text-xs border border-pink-700">Polishing dance moves...</span>
                      <span className="bg-blue-900/50 px-3 py-1 rounded-full text-xs border border-blue-700">Rendering magic...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="max-w-md text-center text-gray-400 italic">
              "Video generation can take a few minutes. Great things take time!"
            </div>
          </div>
        )}

        {state.status === 'completed' && persona && (
          <div className="space-y-6">
            <div className="rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-green-500/30">
              <video 
                src={state.videoUrl} 
                autoPlay 
                loop 
                controls 
                className="w-full"
              />
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
              <h3 className="text-xl font-bold mb-2 flex items-center">
                <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <i className="fas fa-check text-green-400 text-xs"></i>
                </span>
                Meet your {persona.objectName}!
              </h3>
              <p className="text-gray-300 leading-relaxed italic">
                "{persona.personality}"
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={reset}
                className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-colors"
              >
                Animate Another
              </button>
              <a 
                href={state.videoUrl} 
                download={`animated-${persona.objectName}.mp4`}
                className="flex-1 py-4 bg-purple-600 rounded-2xl font-bold text-center hover:bg-purple-500 transition-colors"
              >
                Save Video
              </a>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-3xl text-center">
            <i className="fas fa-circle-exclamation text-4xl text-red-500 mb-4"></i>
            <h3 className="text-xl font-bold mb-2">Oops! Magic backfired</h3>
            <p className="text-gray-400 mb-6">{state.error}</p>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-500 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      <footer className="mt-auto py-8 text-gray-600 text-sm font-medium">
        Powered by Gemini 3 & Veo 3.1
      </footer>
    </div>
  );
};

export default App;
