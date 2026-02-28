import React from 'react';
import ImageUploadSlot from '../ImageUploadSlot';
import type { KurtiImageSet } from '../../types';
import { KurtiConfig } from '../../services/geminiService';

interface KurtiWorkflowProps {
  images: KurtiImageSet;
  config: KurtiConfig;
  onImageChange: (type: keyof KurtiImageSet, file: File | null) => void;
  onConfigChange: (updates: Partial<KurtiConfig>) => void;
}

const KurtiWorkflow: React.FC<KurtiWorkflowProps> = ({ images, config, onImageChange, onConfigChange }) => {
  
  const slots = [
    { id: 'frontView', title: 'Front View (Flat Lay)', description: 'Full view of the Kurti/Suit laid flat.', required: true },
    { id: 'bottoms', title: 'Bottoms (Salwar/Pants)', description: 'Matching salwar, pants or leggings.', required: false },
    { id: 'dupatta', title: 'Dupatta', description: 'The scarf or stole (if applicable).', required: false },
    { id: 'fabricDetail', title: 'Top Fabric Detail', description: 'Close-up of pattern or embroidery on the Kurti.', required: false },
    { id: 'secondaryFabricDetail', title: 'Dupatta/Secondary Detail', description: 'Texture for Dupatta (if uploaded) or Bottoms.', required: false },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Category Selector */}
      <div className="flex space-x-4 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => onConfigChange({ subCategory: 'kurti' })}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            config.subCategory === 'kurti'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Kurti (Top Only)
        </button>
        <button
          onClick={() => onConfigChange({ subCategory: 'suit' })}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            config.subCategory === 'suit'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Salwar Suit (Set)
        </button>
      </div>

      <div className="space-y-4">
        {slots.map(slot => (
            <ImageUploadSlot
                key={slot.id}
                title={slot.title}
                description={slot.description}
                isRequired={slot.required}
                currentImage={images[slot.id]}
                onFileSelect={(file) => onImageChange(slot.id, file)}
            />
        ))}
      </div>

      <div className="mt-4 border-t border-rose-100 pt-6">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
            <label className="block text-sm font-semibold text-gray-800">Garment Construction</label>
            <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs text-gray-500 block mb-1">Fit Type</label>
                    <select 
                        value={config.fit} 
                        onChange={(e) => onConfigChange({ fit: e.target.value })}
                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                    >
                        <option>Regular Fit</option>
                        <option>Slim Fit</option>
                        <option>Loose / Oversized</option>
                        <option>Anarkali / Flared</option>
                    </select>
                    </div>
                    <div>
                    <label className="text-xs text-gray-500 block mb-1">Sleeve Length</label>
                    <select 
                        value={config.sleeveLength} 
                        onChange={(e) => onConfigChange({ sleeveLength: e.target.value })}
                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                    >
                        <option>Sleeveless</option>
                        <option>Cap Sleeves</option>
                        <option>3/4 Sleeves</option>
                        <option>Full Sleeves</option>
                    </select>
                    </div>
                    <div>
                    <label className="text-xs text-gray-500 block mb-1">Neckline</label>
                    <select 
                        value={config.neckline} 
                        onChange={(e) => onConfigChange({ neckline: e.target.value })}
                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                    >
                        <option>Round Neck</option>
                        <option>V-Neck</option>
                        <option>Collar / Chinese</option>
                        <option>Boat Neck</option>
                    </select>
                    </div>
            </div>

            {/* Enhanced Realism Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                    <span className="text-sm font-medium text-gray-700">Enable Enhanced Fabric Realism</span>
                    <p className="text-xs text-gray-500">Improves folds, embroidery, and transparency.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={config.enableEnhancedRealism || false}
                        onChange={(e) => onConfigChange({ enableEnhancedRealism: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default KurtiWorkflow;