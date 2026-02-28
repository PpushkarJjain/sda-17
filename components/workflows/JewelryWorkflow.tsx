import React, { useState } from 'react';
import ImageUploadSlot from '../ImageUploadSlot';
import type { JewelryImageSet } from '../../types';
import { JewelryConfig } from '../../services/geminiService';
import { PlusIcon } from '../icons/PlusIcon';
import { MagicIcon } from '../icons/MagicIcon';

interface JewelryWorkflowProps {
  images: JewelryImageSet;
  config: JewelryConfig;
  onImageChange: (type: keyof JewelryImageSet, file: File | null) => void;
  onConfigChange: (updates: Partial<JewelryConfig>) => void;
}

const getFitOptions = (type: string) => {
    switch(type) {
        case 'Necklace Set':
        case 'Pendant Chain':
            return ['Standard (Princess)', 'Choker (Tight)', 'Collar (Base of Neck)', 'Matinee (Chest Level)', 'Rani Haar (Long/Navel)'];
        case 'Earrings Only':
            return ['Standard (Drop)', 'Studs (Lobe Only)', 'Jhumkas/Chandbalis (Heavy)', 'Shoulder Dusters (Long)', 'Ear Cuffs'];
        case 'Bangles / Bracelet':
            return ['Standard (Loose)', 'Cuff (Tight)', 'Armlet (Upper Arm)'];
        case 'Ring':
            return ['Standard', 'Midi (Knuckle)', 'Cocktail (Oversized)'];
        case 'Nose Ring / Nath':
            return ['Stud (Small)', 'Ring (Hoop)', 'Bridal Nath (Large + Chain)'];
        case 'Maang Tikka':
            return ['Standard', 'Matha Patti (Full Forehead)'];
        default:
            return ['Standard'];
    }
};

const JewelryWorkflow: React.FC<JewelryWorkflowProps> = ({ images, config, onImageChange, onConfigChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const fitOptions = getFitOptions(config.type);

  const viewMode = config.viewMode || 'model'; // Default to model if undefined

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Mode Toggle Switch */}
      <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
          <button 
              onClick={() => onConfigChange({ viewMode: 'model' })} 
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all ${viewMode === 'model' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <span className="font-bold text-sm">Model Showcase</span>
              <span className="text-[10px] opacity-70">Try-on (Human)</span>
          </button>
          <button 
              onClick={() => onConfigChange({ viewMode: 'product' })} 
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all ${viewMode === 'product' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              <span className="font-bold text-sm">Product Photography</span>
              <span className="text-[10px] opacity-70">Macro Shot (No Human)</span>
          </button>
      </div>

      {/* Primary Essential Uploads */}
      <div className="space-y-4">
        <ImageUploadSlot
            title="Product Shot"
            description="Clear photo of the jewelry item on white background."
            isRequired={true}
            currentImage={images.productShot}
            onFileSelect={(file) => onImageChange('productShot', file)}
        />
        <ImageUploadSlot
            title="Scale Reference"
            description="Photo on a mannequin or scale for size accuracy."
            isRequired={false}
            currentImage={images.mannequinShot}
            onFileSelect={(file) => onImageChange('mannequinShot', file)}
        />
      </div>

      {/* Advanced / Optional Angles */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 flex items-center justify-between text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
              <span>Add More Angles (Recommended for 3D Realism)</span>
              <PlusIcon className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-45' : ''}`} />
          </button>
          
          {showAdvanced && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="col-span-2 sm:col-span-1">
                    <ImageUploadSlot
                        title="Side View / Profile"
                        description="Shows height of setting & shank details."
                        isRequired={false}
                        currentImage={images.sideView}
                        onFileSelect={(file) => onImageChange('sideView', file)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <ImageUploadSlot
                        title="Top View"
                        description="Direct overhead shot of the stone/design."
                        isRequired={false}
                        currentImage={images.topView}
                        onFileSelect={(file) => onImageChange('topView', file)}
                    />
                  </div>
                  <div className="col-span-2">
                    <ImageUploadSlot
                        title="Back View / Inside"
                        description="Shows the inner detailing or clasp mechanism."
                        isRequired={false}
                        currentImage={images.backView}
                        onFileSelect={(file) => onImageChange('backView', file)}
                    />
                  </div>
              </div>
          )}
      </div>

      <div className="mt-4 border-t border-rose-100 pt-6">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
            <label className="block text-sm font-semibold text-gray-800">Jewelry Specifications</label>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs text-gray-500 block mb-1">Jewelry Type</label>
                    <select 
                        value={config.type} 
                        onChange={(e) => {
                            const newType = e.target.value;
                            const newOptions = getFitOptions(newType);
                            onConfigChange({ 
                                type: newType,
                                fit: newOptions[0] // Auto-select first valid fit for new type
                            });
                        }}
                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                    >
                        <option>Necklace Set</option>
                        <option>Earrings Only</option>
                        <option>Pendant Chain</option>
                        <option>Bangles / Bracelet</option>
                        <option>Ring</option>
                        <option>Nose Ring / Nath</option>
                        <option>Maang Tikka</option>
                    </select>
                    </div>
                    <div>
                    <label className="text-xs text-gray-500 block mb-1">Metal Tone</label>
                    <select 
                        value={config.metal} 
                        onChange={(e) => onConfigChange({ metal: e.target.value })}
                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                    >
                        <option>Gold</option>
                        <option>Silver / Diamond</option>
                        <option>Rose Gold</option>
                        <option>Oxidized Silver</option>
                        <option>Antique Gold</option>
                        <option>Platinum</option>
                    </select>
                    </div>
                    
                    {/* New Fit / Style Selector */}
                    <div className="col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">Fit / Sizing Style (Contextual)</label>
                        <select 
                            value={config.fit} 
                            onChange={(e) => onConfigChange({ fit: e.target.value })}
                            className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500"
                        >
                            {fitOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Use this to describe how the jewelry should sit on the body (e.g., tight choker vs long necklace).
                        </p>
                    </div>
                </div>
        </div>

        {/* Enhanced Jewelry Realism Toggle */}
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex items-center h-5 mt-0.5">
                    <input
                        type="checkbox"
                        checked={config.enableEnhancedRealism || false}
                        onChange={(e) => onConfigChange({ enableEnhancedRealism: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <div className="flex items-center gap-2 font-semibold text-indigo-900 text-sm">
                        <MagicIcon className="w-4 h-4" />
                        Enable Enhanced Jewelry Realism
                    </div>
                    <p className="text-xs text-indigo-700 mt-1">
                        First analyzes gemstones & metal physics (dispersion, refraction, patina) for ultra-realistic light behavior. Generation takes slightly longer.
                    </p>
                </div>
            </label>
        </div>
      </div>
    </div>
  );
};

export default JewelryWorkflow;