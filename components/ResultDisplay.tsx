import React from 'react';
import Spinner from './Spinner';
import { ReloadIcon } from './icons/ReloadIcon';
import { WarningIcon } from './icons/WarningIcon';
import GeneratedImageCard from './GeneratedImageCard';
import { GeneratedImageItem } from '../types';
import { UndoIcon } from './icons/UndoIcon';

interface ResultDisplayProps {
  isLoading: boolean;
  images: GeneratedImageItem[];
  error: string | null;
  onRegenerate: () => void;
  onRefine: (imageIndex: number, prompt: string, resolution: 'Standard' | 'High' | 'Ultra HD') => void;
  onUndo: (imageIndex: number) => void;
  onUndoBatch: () => void;
  canUndoBatch: boolean;
  onImageClick: (src: string) => void;
  refiningIndex: number | null;
  onVariation: (index: number) => void;
  onVideo: (index: number) => void;
}

const Placeholder: React.FC = () => (
    <div className="aspect-w-3 aspect-h-4 bg-gray-200 rounded-lg animate-pulse"></div>
);

const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, images, error, onRegenerate, onRefine, onUndo, onUndoBatch, canUndoBatch, onImageClick, refiningIndex, onVariation, onVideo }) => {
  const hasResults = images.length > 0;

  return (
    <div className="w-full p-4 bg-gray-100 rounded-lg shadow-inner min-h-[30rem] flex flex-col">
      <div className="relative mb-4">
        <h3 className="text-lg font-bold text-gray-700 text-center">Generated Models</h3>
        {canUndoBatch && !isLoading && (
            <button 
                onClick={onUndoBatch}
                className="absolute right-0 top-0 flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition-colors bg-white/50 px-2 py-1 rounded border border-gray-200 hover:bg-white"
                title="Restore previous generation"
            >
                <UndoIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Undo Clear</span>
            </button>
        )}
      </div>
      <div className="flex-grow flex items-center justify-center">
        {isLoading && !refiningIndex && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <Placeholder />
            <Placeholder />
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
            <WarningIcon />
            <p className="font-semibold mt-2">Generation Failed</p>
            <p className="text-sm">{error}</p>
            <button
                onClick={onRegenerate}
                className="mt-4 flex items-center justify-center gap-2 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-600 transition-all"
              >
                <ReloadIcon />
                Try Again
            </button>
          </div>
        )}

        {!isLoading && !hasResults && (
            <div className="text-center text-gray-500">
                <p className="text-lg font-medium">Your results will appear here</p>
                <p className="text-sm">Upload a saree and click "Drape it!" to start.</p>
            </div>
        )}

        {(hasResults) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {images.map((item, index) => (
              <GeneratedImageCard
                key={`${index}-${item.current.substring(item.current.length - 20)}`} // Add part of src to key to force re-render on change
                src={item.current}
                index={index}
                isRefining={refiningIndex === index}
                onRefine={onRefine}
                onUndo={() => onUndo(index)}
                canUndo={item.history.length > 0}
                onImageClick={onImageClick}
                onVariation={() => onVariation(index)}
                onVideo={() => onVideo(index)}
                history={item.history}
              />
            ))}
          </div>
        )}
      </div>
      {hasResults && !isLoading && (
         <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600">Not satisfied? Try generating again from scratch.</p>
             <button
                onClick={onRegenerate}
                className="flex items-center justify-center gap-2 bg-rose-100 text-rose-800 font-semibold py-2 px-5 rounded-lg border border-rose-300 hover:bg-rose-200 transition-all"
              >
                <ReloadIcon />
                Re-generate
            </button>
         </div>
      )}
    </div>
  );
};

export default ResultDisplay;