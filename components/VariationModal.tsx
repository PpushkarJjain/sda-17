import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { UploadIcon } from './icons/UploadIcon';
import { WandIcon } from './icons/WandIcon';
import { BrushIcon } from './icons/BrushIcon';
import { EraserIcon } from './icons/EraserIcon';
import { UndoIcon } from './icons/UndoIcon';
import Spinner from './Spinner';

import type { FashionCategory } from '../types';

interface VariationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  onGenerate: (config: VariationConfig) => void;
  isLoading: boolean;
  category: FashionCategory;
}

export interface VariationConfig {
  locks: {
    saree: boolean;
    model: boolean;
    background: boolean;
  };
  pose: string;
  background: string;
  aspectRatio: string;
  resolution: 'Standard' | 'High' | 'Ultra HD';
  referenceImage: File | null;
  sareeEditPrompt: string;
  sareeColor: string;
  maskData: string | null; // Base64 of the painted mask
  elementReferenceImage: File | null;
  lockIdentity: boolean;
}

// Category-aware labels and options
const CATEGORY_CONFIG: Record<FashionCategory, {
  lockLabel: string;
  editExamples: string;
  editExamplesMask: string;
  recolorPlaceholder: string;
  referenceLabel: string;
  precisionHint: string;
  poses: string[];
  backgrounds: string[];
}> = {
  saree: {
    lockLabel: 'Saree',
    editExamples: 'e.g., Make the saree red, add golden border...',
    editExamplesMask: 'e.g., Change this necklace to diamond, Make the border thinner...',
    recolorPlaceholder: 'e.g., Royal Blue, Deep Emerald, Gold',
    referenceLabel: 'Upload Pattern/Jewelry Reference',
    precisionHint: 'e.g., the neckline, jewelry, or hem',
    poses: ['Standing Gracefully', 'Walking Pose', 'Seated Elegantly', 'Dancing Pose', 'Backside Pose', 'Close-Up Pose', 'Match Uploaded Reference', 'Custom Pose'],
    backgrounds: ['Studio Lighting', 'Outdoor Garden', 'Temple', 'Festive Lights', 'Luxury Interior'],
  },
  kurti: {
    lockLabel: 'Kurti',
    editExamples: 'e.g., Change sleeve length to 3/4, add embroidery on neckline...',
    editExamplesMask: 'e.g., Change this dupatta color, modify the collar style...',
    recolorPlaceholder: 'e.g., Teal Blue, Dusty Rose, Mustard Yellow',
    referenceLabel: 'Upload Pattern/Detail Reference',
    precisionHint: 'e.g., the neckline, sleeves, or dupatta',
    poses: ['Standing Casual', 'Walking Pose', 'Seated Cross-Legged', 'Leaning Pose', 'Looking Over Shoulder', 'Close-Up (Top Half)', 'Match Uploaded Reference', 'Custom Pose'],
    backgrounds: ['Studio Lighting', 'Urban Street', 'Coffee Shop', 'Minimalist Interior', 'Outdoor Park'],
  },
  lehenga: {
    lockLabel: 'Lehenga',
    editExamples: 'e.g., Add more embroidery, change dupatta draping...',
    editExamplesMask: 'e.g., Change the choli design, modify the belt...',
    recolorPlaceholder: 'e.g., Bridal Red, Royal Maroon, Blush Pink',
    referenceLabel: 'Upload Embroidery/Pattern Reference',
    precisionHint: 'e.g., the choli, belt, skirt, or dupatta',
    poses: ['Bridal Standing (Royal)', 'Twirling Pose', 'Seated Regally', 'Walking (Train Visible)', 'Backside (Dupatta Focus)', 'Close-Up (Choli Detail)', 'Match Uploaded Reference', 'Custom Pose'],
    backgrounds: ['Studio Lighting', 'Grand Palace Hall', 'Wedding Mandap', 'Royal Garden', 'Festive Lights'],
  },
  jewelry: {
    lockLabel: 'Jewelry',
    editExamples: 'e.g., Change stone color to ruby, make chain thicker...',
    editExamplesMask: 'e.g., Change this pendant, swap the gemstone...',
    recolorPlaceholder: 'e.g., Rose Gold, Antique Silver, Polki',
    referenceLabel: 'Upload Gemstone/Design Reference',
    precisionHint: 'e.g., the pendant, stones, or clasp area',
    poses: ['Neck & Shoulder (Necklace)', 'Hand Close-Up (Ring/Bracelet)', 'Ear Close-Up (Earrings)', 'Full Portrait', 'Profile Angle', 'Flat Lay (Top Down)', 'Match Uploaded Reference', 'Custom Pose'],
    backgrounds: ['Studio Lighting', 'Velvet Drape', 'Marble Surface', 'Luxury Interior', 'Soft Bokeh'],
  },
};

const VariationModal: React.FC<VariationModalProps> = ({ isOpen, onClose, originalImage, onGenerate, isLoading, category }) => {
  const catConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.saree;
  const [locks, setLocks] = useState({ saree: true, model: false, background: false });
  const [pose, setPose] = useState(catConfig.poses[0]);
  const [customPose, setCustomPose] = useState('');
  const [background, setBackground] = useState('Studio Lighting');
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [sareeEditPrompt, setSareeEditPrompt] = useState('');
  const [sareeColor, setSareeColor] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [elementRefImage, setElementRefImage] = useState<File | null>(null);
  const [lockIdentity, setLockIdentity] = useState(false);
  const [resolution, setResolution] = useState<'Standard' | 'High' | 'Ultra HD'>('Standard');
  
  // Magic Brush State
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushMode, setBrushMode] = useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = useState(25);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  
  // Undo Stack
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocks({ saree: true, model: false, background: false });
      setPose(catConfig.poses[0]);
      setSareeEditPrompt('');
      setSareeColor('');
      setReferenceImage(null);
      setElementRefImage(null);
      setIsBrushActive(false);
      setBrushMode('draw');
      setHasMask(false);
      setCanvasHistory([]);
      setResolution('Standard');
      
      // Init Canvas on image load
      const img = new Image();
      img.src = originalImage;
      img.onload = () => {
          if (canvasRef.current && containerRef.current) {
              canvasRef.current.width = img.naturalWidth;
              canvasRef.current.height = img.naturalHeight;
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
      }
    }
  }, [isOpen, originalImage]);

  const saveHistory = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setCanvasHistory(prev => [...prev.slice(-9), data]); // Keep last 10
      }
  };

  const handleUndo = () => {
      if (canvasHistory.length === 0) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          const newHistory = [...canvasHistory];
          const previousState = newHistory.pop();
          if (previousState) {
              ctx.putImageData(previousState, 0, 0);
              setCanvasHistory(newHistory);
              setHasMask(checkIfMaskEmpty(ctx, canvas.width, canvas.height));
          }
      }
  };

  const checkIfMaskEmpty = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = ctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) return true;
      }
      return false;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isBrushActive || !canvasRef.current) return;
    setIsDrawing(true);
    saveHistory(); // Save before drawing
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) setHasMask(checkIfMaskEmpty(ctx, canvas.width, canvas.height));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize * (canvas.width / rect.width); // Scale brush relative to image

    if (brushMode === 'draw') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)'; // Rose-500 with opacity
    } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  // Reset path on mouse up to avoid connecting lines
  const handleEnd = () => {
      stopDrawing();
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.beginPath();
  }

  if (!isOpen) return null;

  const handleGenerate = () => {
    const maskData = hasMask && canvasRef.current ? canvasRef.current.toDataURL() : null;
    const finalPose = pose === 'Custom Pose' ? customPose : pose;

    onGenerate({
      locks,
      pose: finalPose,
      background,
      aspectRatio,
      resolution,
      referenceImage,
      sareeEditPrompt,
      sareeColor,
      maskData: maskData,
      elementReferenceImage: elementRefImage,
      lockIdentity
    });
  };

  const toggleLock = (key: keyof typeof locks) => {
    setLocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const handleElementRefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setElementRefImage(e.target.files[0]);
    }
  };

  const isEditingSareeMode = !locks.saree;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] md:h-[90vh] flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Image & Canvas Area */}
        <div className="w-full md:w-1/2 bg-gray-900 relative flex items-center justify-center p-2 md:p-4 min-h-[200px] max-h-[40vh] md:max-h-none shrink-0 md:shrink">
          <div 
            ref={containerRef}
            className={`relative max-w-full max-h-full select-none ${isBrushActive ? 'cursor-crosshair' : ''}`}
          >
            <img 
                src={originalImage} 
                alt="Original" 
                className="max-h-[35vh] md:max-h-[85vh] object-contain select-none pointer-events-none" 
            />
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-auto touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={handleEnd}
                style={{ pointerEvents: isBrushActive ? 'auto' : 'none' }}
            />
          </div>
          
          {/* Floating Canvas Tools */}
          {isEditingSareeMode && (
              <div className="absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-1.5 md:p-2 rounded-full shadow-2xl flex items-center gap-1.5 md:gap-2 border border-gray-200 z-40 max-w-[95%]">
                  <button 
                    onClick={() => setIsBrushActive(!isBrushActive)}
                    className={`p-2 rounded-full transition-all ${isBrushActive ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Toggle Magic Brush"
                  >
                      <BrushIcon />
                  </button>
                  
                  {isBrushActive && (
                      <div className="flex items-center gap-2 px-2 border-l border-gray-300 animate-in fade-in slide-in-from-bottom-2">
                          <button 
                            onClick={() => setBrushMode('draw')}
                            className={`p-1.5 rounded-full ${brushMode === 'draw' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500' : 'text-gray-500 hover:text-gray-800'}`}
                            title="Draw Mask"
                          >
                              <div className="w-3 h-3 bg-current rounded-full"></div>
                          </button>
                          <button 
                            onClick={() => setBrushMode('erase')}
                            className={`p-1.5 rounded-full ${brushMode === 'erase' ? 'bg-gray-200 text-gray-800 ring-2 ring-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Eraser"
                          >
                              <EraserIcon className="w-4 h-4" />
                          </button>
                          
                          <div className="w-px h-6 bg-gray-300 mx-1"></div>
                          
                          <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-rose-600"
                            title="Brush Size"
                          />
                          
                          <div className="w-px h-6 bg-gray-300 mx-1"></div>

                          <button 
                            onClick={handleUndo}
                            disabled={canvasHistory.length === 0}
                            className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                            title="Undo Stroke"
                          >
                              <UndoIcon className="w-5 h-5" />
                          </button>
                      </div>
                  )}
              </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-1/2 flex flex-col bg-gray-50 min-h-0 flex-1">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <WandIcon /> Magic Editor
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                <CloseIcon />
            </button>
          </div>

          <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-6 md:space-y-8">
            
            {/* 1. Locks System */}
            <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">1. Lock Elements (What stays same?)</h4>
                <div className="grid grid-cols-3 gap-3">
                    {[['saree', catConfig.lockLabel], ['model', category === 'jewelry' ? 'Display' : 'Model'], ['background', 'Background']].map(([key, label]) => {
                        const isLocked = locks[key as keyof typeof locks];
                        return (
                            <button
                                key={key}
                                onClick={() => toggleLock(key as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                    isLocked 
                                    ? 'border-rose-500 bg-rose-50 text-rose-700' 
                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                }`}
                            >
                                {isLocked ? <LockIcon className="mb-2" /> : <UnlockIcon className="mb-2" />}
                                <span className="font-semibold text-sm">{label}</span>
                                <span className="text-[10px] uppercase mt-1">{isLocked ? 'Locked' : 'Unlocked'}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* AI Mode Indicator (Fix #9) */}
            {(() => {
              let modeLabel = '';
              let modeColor = '';
              let modeDescription = '';
              if (!locks.saree && hasMask) {
                modeLabel = '🎯 Precision Inpainting';
                modeColor = 'bg-violet-50 border-violet-200 text-violet-800';
                modeDescription = 'AI will edit only the painted area with high precision.';
              } else if (!locks.saree) {
                modeLabel = '✏️ Garment Edit';
                modeColor = 'bg-indigo-50 border-indigo-200 text-indigo-800';
                modeDescription = 'AI will modify the garment while preserving the model and background.';
              } else if (locks.saree && !locks.model) {
                modeLabel = '📸 New Pose Generation';
                modeColor = 'bg-blue-50 border-blue-200 text-blue-800';
                modeDescription = 'AI will regenerate with a new model/pose, keeping the garment consistent.';
              } else if (locks.saree && locks.model && !locks.background) {
                modeLabel = '🖼️ Background Swap';
                modeColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                modeDescription = 'AI will replace only the background with adapted lighting.';
              } else {
                modeLabel = '';
              }
              return modeLabel ? (
                <div className={`p-2.5 rounded-lg border text-xs font-medium ${modeColor} flex items-center gap-2`}>
                  <span className="font-bold">{modeLabel}</span>
                  <span className="opacity-75">— {modeDescription}</span>
                </div>
              ) : null;
            })()}

            <hr className="border-gray-200" />

            {/* Output Quality Selector */}
            <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Output Quality</h4>
                <div className="grid grid-cols-3 gap-2">
                    {(['Standard', 'High', 'Ultra HD'] as const).map((level) => {
                        const isActive = resolution === level;
                        const isPaid = level !== 'Standard';
                        return (
                            <button
                                key={level}
                                onClick={() => setResolution(level)}
                                className={`relative p-2.5 rounded-lg border-2 text-center transition-all text-sm font-semibold ${
                                    isActive
                                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                {level}
                                {isPaid && (
                                    <span className={`block text-[10px] font-normal mt-0.5 ${
                                        isActive ? 'text-rose-500' : 'text-amber-500'
                                    }`}>Paid Key</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* 2. Variation Settings */}
            <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">2. Variation Settings</h4>
                
                {/* SCENARIO A: Saree Locked (Preserve Saree) */}
                {locks.saree && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        
                        {/* Mode Indicator */}
                        {(!locks.model || !locks.background) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                <strong>Mode:</strong> {' '}
                                {!locks.model && !locks.background && "Full Reshoot (New Pose & Background)."}
                                {!locks.model && locks.background && `New ${category === 'jewelry' ? 'Display' : 'Pose'} (Background Preserved).`}
                                {locks.model && !locks.background && `Change Background (Keep ${category === 'jewelry' ? 'Display' : 'Model'} & ${catConfig.lockLabel}).`}
                            </div>
                        )}

                        {locks.model && locks.background && (
                             <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 text-center">
                                <p className="italic">All elements are locked — no variation possible in this mode.</p>
                                <p className="mt-1.5 text-xs text-gray-500">💡 <strong>Tip:</strong> Unlock <strong>"{category === 'jewelry' ? 'Display' : 'Model'}"</strong> for a new pose, unlock <strong>"Background"</strong> to swap the scene, or unlock <strong>"{catConfig.lockLabel}"</strong> to use the precision brush editor.</p>
                             </div>
                        )}

                        {/* Pose Settings - ONLY if Model is UNLOCKED */}
                        {!locks.model && (
                             <div className="space-y-4">
                                <h5 className="font-bold text-gray-600 text-sm uppercase tracking-wide border-b border-gray-100 pb-1 flex items-center gap-2">
                                    <UnlockIcon className="w-3 h-3" /> {category === 'jewelry' ? 'Display & Angle' : 'Model & Pose'}
                                </h5>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{category === 'jewelry' ? 'New Display Angle' : 'New Pose'}</label>
                                    <select 
                                        value={pose} 
                                        onChange={(e) => setPose(e.target.value)}
                                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded focus:ring-rose-500 text-sm"
                                    >
                                        {catConfig.poses.map(p => (
                                            <option key={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                {pose === 'Custom Pose' && (
                                     <div className="animate-in fade-in slide-in-from-top-1">
                                        <textarea
                                            value={customPose}
                                            onChange={(e) => setCustomPose(e.target.value)}
                                            placeholder="Describe the pose (e.g., Leaning against a wall, looking over shoulder)..."
                                            className="w-full p-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded focus:ring-rose-500 text-sm h-20 resize-none"
                                        />
                                     </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Aspect Ratio</label>
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value)}
                                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded focus:ring-rose-500 text-sm"
                                    >
                                        <option value="1:1">1:1 (Square)</option>
                                        <option value="3:4">3:4 (Portrait)</option>
                                        <option value="4:3">4:3 (Landscape)</option>
                                        <option value="9:16">9:16 (Story)</option>
                                        <option value="16:9">16:9 (Cinematic)</option>
                                    </select>
                                </div>
                                
                                <div className="mt-2">
                                     <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Style/Pose Reference <span className="text-xs font-normal text-gray-500">(Optional)</span>
                                     </label>
                                     <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center bg-white hover:bg-gray-50 transition-colors">
                                        {referenceImage ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="truncate max-w-[200px] font-medium text-gray-700">{referenceImage.name}</span>
                                                    <button onClick={() => setReferenceImage(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                                                </div>
                                                <div className="border-t border-gray-100 pt-2 flex items-start gap-2 text-left">
                                                    <input 
                                                        type="checkbox" 
                                                        id="lockIdentity" 
                                                        checked={lockIdentity} 
                                                        onChange={(e) => setLockIdentity(e.target.checked)}
                                                        className="mt-1"
                                                    />
                                                    <div>
                                                        <label htmlFor="lockIdentity" className="text-xs font-bold text-gray-700 block cursor-pointer">Preserve Reference Model Identity (Requires Consent)</label>
                                                        <p className="text-[10px] text-gray-500 leading-tight">
                                                            {lockIdentity 
                                                            ? "⚠️ You confirm you have rights to this person's likeness." 
                                                            : "AI will strictly anonymize the face."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center gap-1">
                                                <UploadIcon className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs text-rose-600 font-semibold">Upload Reference Image</span>
                                                <input type="file" className="hidden" onChange={handleFileChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Background Settings - ONLY if Background is UNLOCKED */}
                        {!locks.background && (
                            <div className="space-y-4 pt-2">
                                <h5 className="font-bold text-gray-600 text-sm uppercase tracking-wide border-b border-gray-100 pb-1 flex items-center gap-2">
                                    <UnlockIcon className="w-3 h-3" /> Environment
                                </h5>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">New Background</label>
                                    <select 
                                        value={background} 
                                        onChange={(e) => setBackground(e.target.value)}
                                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded focus:ring-rose-500 text-sm"
                                    >
                                        {catConfig.backgrounds.map(bg => (
                                            <option key={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SCENARIO B: Editing Product (Saree/Garment Unlocked) */}
                {isEditingSareeMode && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                         <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-900 mb-4">
                            <strong>Precision Edit Mode:</strong> Use the brush to paint over the specific area you want to change ({catConfig.precisionHint}).
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-700">Paint Target Area</label>
                                {!isBrushActive && (
                                    <button 
                                        onClick={() => setIsBrushActive(true)}
                                        className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold hover:bg-rose-200 flex items-center gap-1"
                                    >
                                        <BrushIcon className="w-3 h-3"/> Activate Brush
                                    </button>
                                )}
                            </div>
                            
                            {hasMask ? (
                                <div className="text-xs text-green-600 bg-green-50 border border-green-200 p-2 rounded mb-2 flex items-center gap-2">
                                    <span>✓ Area masked. AI will crop and edit this specific region with high precision.</span>
                                    <button onClick={() => {
                                        const ctx = canvasRef.current?.getContext('2d');
                                        if(ctx) {
                                            ctx.clearRect(0,0,10000,10000); // clear big
                                            setHasMask(false);
                                            setCanvasHistory([]);
                                        }
                                    }} className="text-xs text-red-500 hover:underline font-bold ml-auto">Clear</button>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 mb-2">
                                    Use the brush tool on the image to mask the area. If no area is masked, the entire image will be processed (lower precision).
                                </p>
                            )}
                        </div>
                        
                         {/* Element Replacement Reference */}
                        <div className="mt-2">
                             <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Reference Element Image <span className="text-xs font-normal text-gray-500">(Optional)</span>
                             </label>
                             <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center bg-white hover:bg-gray-50 transition-colors">
                                {elementRefImage ? (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="truncate max-w-[200px] font-medium text-gray-700">{elementRefImage.name}</span>
                                        <button onClick={() => setElementRefImage(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-1">
                                        <UploadIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs text-rose-600 font-semibold">{catConfig.referenceLabel}</span>
                                        <input type="file" className="hidden" onChange={handleElementRefChange} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Recolor Saree Input */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                             <label className="block text-sm font-semibold text-gray-700 mb-1">Recolor / Retexture</label>
                             <input
                                type="text"
                                value={sareeColor}
                                onChange={(e) => setSareeColor(e.target.value)}
                                placeholder={catConfig.recolorPlaceholder}
                                className="w-full p-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded focus:ring-rose-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Edit Instructions</label>
                            <textarea
                                value={sareeEditPrompt}
                                onChange={(e) => setSareeEditPrompt(e.target.value)}
                                placeholder={hasMask ? catConfig.editExamplesMask : catConfig.editExamples}
                                className="w-full p-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm h-24"
                            />
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
                onClick={handleGenerate}
                disabled={
                    isLoading || 
                    (locks.saree && locks.model && locks.background) ||
                    (!locks.saree && !sareeEditPrompt && !sareeColor && !elementRefImage) ||
                    (locks.saree && !locks.model && pose === 'Custom Pose' && !customPose.trim())
                }
                className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed transition-all"
            >
                {isLoading ? (
                    <>
                        <Spinner /> Generating...
                    </>
                ) : (
                    <>
                        <WandIcon /> Generate Variation
                    </>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariationModal;