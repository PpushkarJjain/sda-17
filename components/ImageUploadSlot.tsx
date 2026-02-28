import React, { useCallback, useState } from 'react';
import type { SareeImage } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { ImageFileIcon } from './icons/ImageFileIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ImageUploadSlotProps {
  title: string;
  description: string;
  isRequired: boolean;
  onFileSelect: (file: File | null) => void;
  currentImage: SareeImage | null;
}

const ImageUploadSlot: React.FC<ImageUploadSlotProps> = ({ title, description, isRequired, onFileSelect, currentImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = `upload-${title.replace(/\s+/g, '-')}`;

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [onFileSelect]);
  
  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onFileSelect(null);
  }

  return (
    <div className="w-full">
      <div className="flex items-baseline gap-2 mb-1">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        {isRequired ? (
           <span className="text-xs font-bold text-rose-600">Required</span>
        ) : (
           <span className="text-xs text-gray-500">Optional</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-2">{description}</p>
      
      <label
        htmlFor={inputId}
        className={`relative flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
          ${isDragging ? 'border-rose-500 bg-rose-100' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {currentImage ? (
          <div className="flex items-center w-full h-full p-2 gap-3">
             <img src={currentImage.previewUrl} alt={`${title} preview`} className="object-contain h-full w-20 rounded-md bg-gray-200" />
             <div className="flex-grow text-left">
                <p className="text-sm text-gray-700 font-medium truncate">{currentImage.file.name}</p>
                <p className="text-xs text-gray-500">Click or drag to replace</p>
             </div>
             <button onClick={handleRemove} className="p-1 rounded-full hover:bg-gray-200" aria-label="Remove image">
                <CloseIcon />
             </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
            <UploadIcon className="w-6 h-6" />
            <span><span className="font-semibold text-rose-600">Choose file</span> or drag here</span>
          </div>
        )}
      </label>
      <input 
        id={inputId} 
        type="file" 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp"
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </div>
  );
};

export default ImageUploadSlot;