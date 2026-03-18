import React from 'react';
import ImageUploadSlot from '../ImageUploadSlot';
import { MagicIcon } from '../icons/MagicIcon';
import type { SareeImage, SareeImageSet, SareeImageType } from '../../types';
import { SareeConfig } from '../../services/geminiService';

interface SareeWorkflowProps {
    images: SareeImageSet;
    config: SareeConfig & { enableEnhancedAnalysis: boolean };
    onImageChange: (type: SareeImageType, file: File | null) => void;
    onConfigChange: (updates: Partial<SareeConfig & { enableEnhancedAnalysis: boolean }>) => void;
    colorSetImage: SareeImage | null;
    colorReferenceImage: SareeImage | null;
    onColorSetChange: (file: File | null) => void;
    onColorReferenceChange: (file: File | null) => void;
}

const sareeUploadSlots: {
    id: SareeImageType;
    title: string;
    description: string;
    required: boolean;
}[] = [
        { id: 'fullSaree', title: 'Full Saree Image', description: 'The complete saree laid flat.', required: true },
        { id: 'border', title: 'Saree Border Close-up', description: 'Focus on the border design.', required: false },
        { id: 'pallu', title: 'Saree Pallu Close-up', description: 'Show the pallu section.', required: false },
        { id: 'skirt', title: 'Saree Skirt Portion Close-up', description: 'Capture the main drape portion.', required: false },
        { id: 'blouse', title: 'Blouse Piece Image', description: 'Include the blouse fabric.', required: false },
        { id: 'embroidery', title: 'Embroidery/Design Detail', description: 'A very close-up shot of details.', required: false },
    ];

const SareeWorkflow: React.FC<SareeWorkflowProps> = ({ images, config, onImageChange, onConfigChange, colorSetImage, colorReferenceImage, onColorSetChange, onColorReferenceChange }) => {

    const getPalluMeasurementLabel = () => {
        if (config.palluStyle.includes("Normal C-Pallu")) return "C-Pallu Border Width (inches)";
        if (config.palluStyle.includes("Box Pallu")) return "Box Pallu Width (inches)";
        return "Rich Pallu Width (inches)";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
                {sareeUploadSlots.map(slot => (
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

            <div className="mt-4 border-t border-rose-100 pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="pallu-style-select" className="block text-sm font-semibold text-gray-800 mb-2">
                            Pallu Pattern Style
                        </label>
                        <select
                            id="pallu-style-select"
                            value={config.palluStyle}
                            onChange={(e) => onConfigChange({ palluStyle: e.target.value })}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                        >
                            <option value="Rich Pallu (Grand Zari)">Rich Pallu (Grand Zari)</option>
                            <option value="Box Pallu">Box Pallu</option>
                            <option value="Normal C-Pallu">Normal C-Pallu (Border Formation)</option>
                        </select>
                        <div className="mt-2">
                            <label htmlFor="pallu-measurement" className="block text-xs font-medium text-gray-600 mb-1">
                                {getPalluMeasurementLabel()}
                            </label>
                            <input
                                id="pallu-measurement"
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={config.palluMeasurement}
                                onChange={(e) => onConfigChange({ palluMeasurement: e.target.value })}
                                placeholder="e.g., 24"
                                className="w-full p-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded focus:ring-1 focus:ring-rose-500 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="design-type-select" className="block text-sm font-semibold text-gray-800 mb-2">
                            Saree Design Type
                        </label>
                        <select
                            id="design-type-select"
                            value={config.designType}
                            onChange={(e) => onConfigChange({ designType: e.target.value })}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                        >
                            <option value="Weaving Design">Weaving Design (Banarasi/Kanjivaram)</option>
                            <option value="Embroidery Design">Embroidery Design</option>
                            <option value="Patch Work (Butta/Border)">Patch Work (Butta/Border)</option>
                            <option value="Printed Design">Printed Design</option>
                            <option value="Panel Design">Panel Design (Heavy Bottom Border)</option>
                        </select>
                    </div>
                </div>

                {/* Swarovski Stone Work Toggle */}
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                        <span className="font-semibold text-gray-800 text-sm">Apply Swarovski / Stone Work?</span>
                        <input
                            type="checkbox"
                            checked={config.hasStoneWork}
                            onChange={e => onConfigChange({ hasStoneWork: e.target.checked })}
                            className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 border-gray-300"
                        />
                    </label>

                    {config.hasStoneWork && (
                        <div className="mt-2 pl-1 animate-in fade-in slide-in-from-top-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Where should the stones be applied?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Border Only', 'Butta / Motifs Only', 'Border & Butta', 'Overall Design'].map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => onConfigChange({ stoneWorkLocation: loc })}
                                        className={`text-xs py-2 px-3 rounded-md border text-center transition-colors ${config.stoneWorkLocation === loc
                                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Jewellery & Bindi Options */}
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">Jewellery Styling & Accessories</label>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Jewellery Intensity</label>
                            <div className="grid grid-cols-4 gap-1">
                                {['None', 'Sober', 'Medium', 'Heavy'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => onConfigChange({ jewelleryLevel: level as any })}
                                        className={`py-2 px-1 text-xs rounded-md border text-center transition-colors font-semibold ${config.jewelleryLevel === level
                                                ? 'bg-rose-50 border-rose-300 text-rose-700'
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">Apply Bindi</span>
                                <span className="text-[10px] text-gray-400">Traditional forehead decoration</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.hasBindi}
                                    onChange={(e) => onConfigChange({ hasBindi: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Enhanced Analysis Toggle */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                type="checkbox"
                                checked={config.enableEnhancedAnalysis}
                                onChange={(e) => onConfigChange({ enableEnhancedAnalysis: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 font-semibold text-indigo-900 text-sm">
                                <MagicIcon className="w-4 h-4" />
                                Enable Enhanced Fabric Realism
                            </div>
                            <p className="text-xs text-indigo-700 mt-1">
                                First analyzes the saree's texture and pattern to ensure higher accuracy. Generation takes slightly longer.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Color Matching Mode */}
                <div className={`p-4 border rounded-lg shadow-sm transition-colors ${config.colorMatchingEnabled ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 text-sm">🎨 Color Matching Display</span>
                            <span className="text-[10px] text-gray-400">Generate a composed product display with mannequin drape + color variant wall</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.colorMatchingEnabled}
                                onChange={(e) => onConfigChange({ colorMatchingEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                    </label>

                    {config.colorMatchingEnabled && (
                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1">
                            <ImageUploadSlot
                                title="Color Set Image"
                                description="Upload an image showing all available color variants of this saree (e.g., 5-6 swatches laid together)."
                                isRequired={false}
                                currentImage={colorSetImage}
                                onFileSelect={onColorSetChange}
                            />
                            <ImageUploadSlot
                                title="Scene Layout Reference"
                                description="Upload a reference display photo showing the desired composition layout (mannequin + color wall)."
                                isRequired={true}
                                currentImage={colorReferenceImage}
                                onFileSelect={onColorReferenceChange}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SareeWorkflow;