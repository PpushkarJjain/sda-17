import React, { useState } from 'react';
import Spinner from './Spinner';
import { DownloadIcon } from './icons/DownloadIcon';
import { WandIcon } from './icons/WandIcon';
import { UndoIcon } from './icons/UndoIcon';
import { MagicIcon } from './icons/MagicIcon';
import { FilmIcon } from './icons/FilmIcon';
import { RefreshIcon } from './icons/RefreshIcon'; // Using RefreshIcon as 'Compare' icon

interface GeneratedImageCardProps {
    src: string;
    index: number;
    isRefining: boolean;
    onRefine: (imageIndex: number, prompt: string, resolution: 'Standard' | 'High' | 'Ultra HD') => void;
    onUndo: () => void;
    canUndo: boolean;
    onImageClick: (src: string) => void;
    onVariation: () => void;
    onVideo: () => void;
    history?: string[]; // Make history available for comparison
}

const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({ src, index, isRefining, onRefine, onUndo, canUndo, onImageClick, onVariation, onVideo, history }) => {
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [resolution, setResolution] = useState<'Standard' | 'High' | 'Ultra HD'>('Standard');
    const [isComparing, setIsComparing] = useState(false);
    const [sliderPosition, setSliderPosition] = useState(50);

    const handleRefineClick = () => {
        onRefine(index, refinementPrompt, resolution);
    };

    const originalSrc = (canUndo && history && history.length > 0) ? history[history.length - 1] : null;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isComparing) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isComparing) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    }

    return (
        <div className="group relative overflow-hidden rounded-lg shadow-lg flex flex-col bg-white">
            <div
                className="relative aspect-w-3 aspect-h-4 cursor-zoom-in overflow-hidden select-none"
                onClick={() => !isComparing && onImageClick(src)}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                {isComparing && originalSrc ? (
                    <>
                        {/* Background (Original) */}
                        <img src={originalSrc} alt="Original" className="absolute inset-0 w-full h-full object-cover" />

                        {/* Foreground (New) - Clipped */}
                        <div
                            className="absolute inset-0 overflow-hidden border-r-2 border-white/80 shadow-r-xl"
                            style={{ width: `${sliderPosition}%` }}
                        >
                            <img src={src} alt="New" className="absolute inset-0 w-[100vw] max-w-none h-full object-cover" style={{ width: '100%' }} /> {/* Trick to keep image scaled same as container */}
                            {/* We need to set the image width to the container width, not the clipped div width. 
                         However, in React, getting the parent width dynamically in style is hard. 
                         CSS 'object-cover' on the full image usually handles standard sizing, 
                         but clipping requires the image to be full width inside the clipped div. 
                         
                         Correction: To compare properly, we usually use background-image or specific sizing.
                         Let's try a simpler approach for the clipped image: width 100% of the PARENT aspect ratio container. 
                         The standard trick is: width of img = 100% of grandparent.
                      */}
                            <img
                                src={src}
                                alt="New"
                                className="absolute top-0 left-0 w-full h-full object-cover"
                                style={{ width: `${100 * (100 / sliderPosition)}%`, maxWidth: 'none' }}
                            />
                            {/* Actually, the standard React compare slider implementation: */}
                        </div>
                        {/* Re-implementation for stability: Two layered images, top one clipped */}
                        <div className="absolute inset-0 pointer-events-none">
                            <img src={originalSrc} className="w-full h-full object-cover" alt="Old" />
                        </div>
                        <div
                            className="absolute inset-0 overflow-hidden border-r-2 border-white"
                            style={{ width: `${sliderPosition}%` }}
                        >
                            <img
                                src={src}
                                className="h-full object-cover"
                                style={{ width: 'calc(100% * (100 / ' + sliderPosition + '))', maxWidth: 'none' }} // Counter-scale width
                                alt="New"
                            />
                            {/* Wait, the counter-scale math is complex to get perfect responsive. 
                         Simpler approach: Fixed width equal to container.
                         We will assume the aspect ratio container sizes the images identically.
                      */}
                        </div>

                        {/* Better Implementation of Clipping */}
                        <img src={originalSrc} className="absolute inset-0 w-full h-full object-cover" alt="Old" />
                        <div className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                            <img src={src} className="absolute inset-0 w-full h-full object-cover" alt="New" />
                        </div>

                        {/* Slider Handle */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
                            style={{ left: `${sliderPosition}%` }}
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md">
                                <div className="flex gap-0.5">
                                    <div className="w-0.5 h-3 bg-gray-400"></div>
                                    <div className="w-0.5 h-3 bg-gray-400"></div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded pointer-events-none">New</div>
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded pointer-events-none">Original</div>
                    </>
                ) : (
                    <img src={src} alt={`Generated model ${index + 1}`} className="w-full h-full object-cover" />
                )}

                {isRefining && (
                    <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-30">
                        <Spinner />
                        <span className="text-sm font-semibold text-rose-800">Refining...</span>
                    </div>
                )}

                {/* Hover Overlay - Hide during compare */}
                {!isRefining && !isComparing && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                )}

                {/* Labels & Buttons */}
                {!isComparing && (
                    <p className="absolute bottom-2 left-2 text-white font-bold text-sm bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                        Model {index + 1}
                    </p>
                )}

                {/* Actions Overlay */}
                <div
                    className={`absolute top-2 right-2 flex flex-col gap-2 transition-opacity duration-300 z-30 ${isComparing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {canUndo && (
                        <button
                            onClick={() => setIsComparing(!isComparing)}
                            className={`p-2 rounded-full text-xs font-bold shadow-md flex items-center justify-center transition-all ${isComparing ? 'bg-blue-600 text-white' : 'bg-white/90 text-blue-600 hover:bg-white'}`}
                            title="Compare with previous version"
                        >
                            {isComparing ? 'Done' : 'Compare'}
                        </button>
                    )}

                    {!isComparing && (
                        <>
                            <button
                                onClick={onVideo}
                                className="p-2 bg-rose-600 rounded-full text-white hover:bg-rose-700 transition-all shadow-md flex items-center gap-1 font-bold"
                                title="Generate Promotional Video"
                            >
                                <FilmIcon className="w-4 h-4" />
                                <span className="text-xs pr-1">Video</span>
                            </button>
                            <button
                                onClick={onVariation}
                                className="p-2 bg-white/90 rounded-full text-rose-600 hover:bg-white transition-all shadow-md flex items-center gap-1 font-bold"
                                title="Open Magic Editor"
                            >
                                <MagicIcon className="w-4 h-4" />
                                <span className="text-xs pr-1">Magic Edit</span>
                            </button>
                            <a
                                href={src}
                                download={`sda-${index + 1}.png`}
                                className="p-2 bg-white/90 rounded-full text-gray-800 hover:bg-white transition-all shadow-md"
                                title={`Download model ${index + 1}`}
                            >
                                <DownloadIcon />
                            </a>
                        </>
                    )}
                </div>
            </div>

            <div className="p-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <label htmlFor={`refine-prompt-${index}`} className="text-xs font-semibold text-gray-600">Quick Refine</label>
                    <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as any)}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-gray-50 text-gray-700 focus:ring-1 focus:ring-rose-500 outline-none"
                        title="Output Quality"
                    >
                        <option value="Standard">Standard</option>
                        <option value="High">High (Pro)</option>
                        <option value="Ultra HD">Ultra HD (Pro)</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <input
                        id={`refine-prompt-${index}`}
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="e.g., change background"
                        disabled={isRefining}
                        className="w-full p-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <button
                        onClick={handleRefineClick}
                        disabled={isRefining || !refinementPrompt.trim()}
                        className="flex items-center justify-center gap-2 bg-rose-600 text-white font-semibold p-2 rounded-md shadow-sm hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed transition-all"
                        title="Refine image"
                    >
                        <WandIcon />
                    </button>
                    {canUndo && (
                        <button
                            onClick={onUndo}
                            disabled={isRefining}
                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 hover:text-rose-600 font-semibold p-2 rounded-md shadow-sm hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all border border-gray-300"
                            title="Undo last change"
                        >
                            <UndoIcon />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratedImageCard;