
import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';

interface FullScreenViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

const FullScreenViewer: React.FC<FullScreenViewerProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Reset state when image opens
  useEffect(() => {
    if (imageUrl) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      positionRef.current = { x: 0, y: 0 };
    }
  }, [imageUrl]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (imageUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [imageUrl]);

  if (!imageUrl) return null;

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Standardize wheel delta
    const delta = -Math.sign(e.deltaY) * 0.2;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    setPosition({
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      positionRef.current = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy,
      };
      setPosition(positionRef.current);
      setIsDragging(false);
    }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label="Close preview"
        >
            <CloseIcon className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
        <button 
            onClick={handleZoomOut}
            className="p-2 hover:text-rose-400 text-white transition-colors"
            aria-label="Zoom out"
        >
            <ZoomOutIcon className="w-6 h-6" />
        </button>
        <span className="text-white font-mono text-sm w-12 text-center">
            {Math.round(scale * 100)}%
        </span>
        <button 
            onClick={handleZoomIn}
            className="p-2 hover:text-rose-400 text-white transition-colors"
            aria-label="Zoom in"
        >
            <ZoomInIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img 
            src={imageUrl} 
            alt="Full screen preview" 
            className="max-w-none transition-transform duration-75 ease-linear select-none"
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                maxHeight: '90vh',
                maxWidth: '90vw',
            }}
            draggable={false}
        />
      </div>
    </div>
  );
};

export default FullScreenViewer;
