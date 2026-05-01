import React, { useState, useRef, useCallback } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PlusIcon } from './icons/PlusIcon';
import type { FashionCategory } from '../types';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: FashionCategory;
  onApply: (assignments: Record<string, File>) => void;
}

interface SlotDef {
  id: string;
  label: string;
  required: boolean;
}

const CATEGORY_SLOTS: Record<FashionCategory, SlotDef[]> = {
  saree: [
    { id: 'fullSaree', label: 'Full Saree', required: true },
    { id: 'border', label: 'Border', required: false },
    { id: 'pallu', label: 'Pallu', required: false },
    { id: 'skirt', label: 'Skirt', required: false },
    { id: 'blouse', label: 'Blouse', required: false },
    { id: 'embroidery', label: 'Embroidery', required: false },
  ],
  kurti: [
    { id: 'frontView', label: 'Front View', required: true },
    { id: 'bottoms', label: 'Bottoms', required: false },
    { id: 'fabricDetail', label: 'Fabric Detail', required: false },
    { id: 'dupatta', label: 'Dupatta', required: false },
    { id: 'secondaryFabricDetail', label: 'Secondary Fabric', required: false },
  ],
  lehenga: [
    { id: 'fullSet', label: 'Full Set', required: true },
    { id: 'lehengaCloseUp', label: 'Lehenga Detail', required: false },
    { id: 'choliCloseUp', label: 'Choli Detail', required: false },
    { id: 'dupattaCloseUp', label: 'Dupatta Detail', required: false },
    { id: 'belt', label: 'Belt', required: false },
  ],
  jewelry: [
    { id: 'productShot', label: 'Product Shot', required: true },
    { id: 'mannequinShot', label: 'Mannequin', required: false },
    { id: 'sideView', label: 'Side View', required: false },
    { id: 'topView', label: 'Top View', required: false },
    { id: 'backView', label: 'Back View', required: false },
  ],
};

const COMMON_SLOT: SlotDef = { id: 'reference', label: 'Style Reference', required: false };

const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ isOpen, onClose, category, onApply }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const allSlots = [...CATEGORY_SLOTS[category], COMMON_SLOT];

  const resetState = useCallback(() => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setActiveIndex(null);
    setAssignments({});
  }, [previews]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;
    const newPreviews = fileArray.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...fileArray]);
    setPreviews(prev => [...prev, ...newPreviews]);
    // Auto-select first image if none selected
    if (activeIndex === null && files.length === 0) {
      setActiveIndex(0);
    }
  };

  const handleInitialSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleImageClick = (index: number) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  const handleRemoveImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove assignments pointing to this image and adjust indices
    const newAssignments: Record<string, number> = {};
    Object.entries(assignments).forEach(([chipId, imgIdx]: [string, number]) => {
      if (imgIdx === index) return; // remove this assignment
      newAssignments[chipId] = imgIdx > index ? imgIdx - 1 : imgIdx;
    });
    setAssignments(newAssignments);

    // Remove file and preview
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));

    // Adjust active index
    if (activeIndex === index) setActiveIndex(null);
    else if (activeIndex !== null && activeIndex > index) setActiveIndex(activeIndex - 1);
  };

  const handleChipClick = (chipId: string) => {
    if (activeIndex === null) return;

    const newAssignments = { ...assignments };

    // Toggle: if this chip already has this image, unassign
    if (newAssignments[chipId] === activeIndex) {
      delete newAssignments[chipId];
      setAssignments(newAssignments);
      return;
    }

    // Remove any other chip pointing to this image
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key] === activeIndex) {
        delete newAssignments[key];
      }
    });

    // Assign
    newAssignments[chipId] = activeIndex;
    setAssignments(newAssignments);

    // Auto-advance to next unassigned image
    const assignedIndices = new Set(Object.values(newAssignments));
    const nextIndex = files.findIndex((_, i) => !assignedIndices.has(i));
    setActiveIndex(nextIndex >= 0 ? nextIndex : null);
  };

  const handleClearChip = (chipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignments(prev => {
      const updated = { ...prev };
      delete updated[chipId];
      return updated;
    });
  };

  const handleApply = () => {
    const result: Record<string, File> = {};
    Object.entries(assignments).forEach(([chipId, imgIdx]) => {
      if (files[imgIdx]) {
        result[chipId] = files[imgIdx];
      }
    });
    onApply(result);
    resetState();
  };

  const handleClearAll = () => {
    setAssignments({});
    setActiveIndex(files.length > 0 ? 0 : null);
  };

  // Get the slot label assigned to an image
  const getImageSlotLabel = (imgIndex: number): string | null => {
    const entry = Object.entries(assignments).find(([, idx]) => idx === imgIndex);
    if (!entry) return null;
    const slot = allSlots.find(s => s.id === entry[0]);
    return slot ? slot.label : null;
  };

  const assignmentCount = Object.keys(assignments).length;
  const requiredSlot = allSlots.find(s => s.required);
  const requiredAssigned = requiredSlot ? assignments[requiredSlot.id] !== undefined : true;

  // Drag-and-drop on the upload zone
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  // STATE 1: No files yet — show upload zone
  if (files.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Batch Upload Photos</h3>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
              <CloseIcon />
            </button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-rose-500 bg-rose-50 scale-[1.02]'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
            }`}
          >
            <UploadIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-base font-semibold text-gray-700 mb-1">
              Select multiple photos
            </p>
            <p className="text-sm text-gray-500">
              or drag and drop them here
            </p>
            <p className="text-xs text-gray-400 mt-3">
              PNG, JPG, WEBP supported
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleInitialSelect}
          />
        </div>
      </div>
    );
  }

  // STATE 2: Files selected — show mapping UI
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header */}
        <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Match Your Photos</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a photo, then click a label to assign it
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 min-h-0">

          {/* Image Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {files.map((file, index) => {
              const isActive = activeIndex === index;
              const slotLabel = getImageSlotLabel(index);
              const isAssigned = slotLabel !== null;

              return (
                <div
                  key={index}
                  onClick={() => handleImageClick(index)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 group ${
                    isActive
                      ? 'border-rose-500 ring-2 ring-rose-500/30 shadow-lg scale-[1.03]'
                      : isAssigned
                        ? 'border-green-400 shadow-sm'
                        : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                  }`}
                >
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Assignment Label Overlay */}
                  {isAssigned && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-green-600/90 to-green-600/60 px-1.5 py-1.5 text-center">
                      <span className="text-white text-[10px] font-bold leading-tight block truncate">
                        {slotLabel}
                      </span>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isActive && !isAssigned && (
                    <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-rose-500 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                    </div>
                  )}

                  {/* Assigned check */}
                  {isAssigned && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveImage(index, e)}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Add More Card */}
            <div
              onClick={() => addMoreRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <PlusIcon className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium mt-1">Add More</span>
            </div>
            <input
              ref={addMoreRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAddMore}
            />
          </div>

          {/* Divider with instruction */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              {activeIndex !== null
                ? `Assign Photo ${activeIndex + 1} to a label`
                : assignmentCount > 0
                  ? `${assignmentCount} assigned`
                  : 'Select a photo above'}
            </span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Input Chips */}
          <div className="flex flex-wrap gap-2">
            {allSlots.map(slot => {
              const assignedImgIdx = assignments[slot.id];
              const isAssigned = assignedImgIdx !== undefined;
              const isClickable = activeIndex !== null || isAssigned;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAssigned && activeIndex === null ? undefined : handleChipClick(slot.id)}
                  disabled={!isClickable}
                  className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                    isAssigned
                      ? 'bg-green-50 border-green-400 text-green-800 hover:bg-green-100'
                      : activeIndex !== null
                        ? 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 cursor-pointer shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {/* Tiny preview thumbnail */}
                  {isAssigned && (
                    <img
                      src={previews[assignedImgIdx]}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-green-300"
                    />
                  )}

                  <span>{slot.label}</span>

                  {slot.required && !isAssigned && (
                    <span className="text-red-500 text-xs">*</span>
                  )}

                  {isAssigned && (
                    <span
                      onClick={(e) => handleClearChip(slot.id, e)}
                      className="ml-0.5 w-4 h-4 rounded-full bg-green-200 hover:bg-red-200 flex items-center justify-center transition-colors"
                      title="Unassign"
                    >
                      <svg className="w-2.5 h-2.5 text-green-700 hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}

                  {slot.id === 'reference' && !isAssigned && (
                    <span className="text-[10px] text-gray-400 font-normal">(common)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {assignmentCount}/{allSlots.length} assigned
            </span>
            {assignmentCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          <button
            onClick={handleApply}
            disabled={assignmentCount === 0 || !requiredAssigned}
            className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-lg shadow-md hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm"
          >
            Apply & Fill Inputs
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;
