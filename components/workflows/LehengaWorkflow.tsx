import React from 'react';
import ImageUploadSlot from '../ImageUploadSlot';
import type { LehengaImageSet } from '../../types';
import { LehengaConfig } from '../../services/geminiService';
import { MagicIcon } from '../icons/MagicIcon';

interface LehengaWorkflowProps {
    images: LehengaImageSet;
    config: LehengaConfig;
    onImageChange: (type: keyof LehengaImageSet, file: File | null) => void;
    onConfigChange: (updates: Partial<LehengaConfig>) => void;
}

const lehengaUploadSlots: {
    id: keyof LehengaImageSet;
    title: string;
    description: string;
    required: boolean;
}[] = [
        { id: 'fullSet', title: 'Full Set (Full View)', description: 'The complete Lehenga + Choli + Dupatta combination.', required: true },
        { id: 'lehengaCloseUp', title: 'Lehenga (Skirt) Detail', description: 'Close-up of the skirt embroidery and fabric.', required: true },
        { id: 'choliCloseUp', title: 'Choli (Blouse) Detail', description: 'Close-up of the blouse work.', required: true },
        { id: 'dupattaCloseUp', title: 'Dupatta Detail', description: 'Pattern detail of the stole/veil.', required: false },
        { id: 'belt', title: 'Waist Belt (Optional)', description: 'Kamarbandh or Belt accessory if applicable.', required: false },
    ];

const LehengaWorkflow: React.FC<LehengaWorkflowProps> = ({ images, config, onImageChange, onConfigChange }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
                {lehengaUploadSlots.map(slot => (
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
                    <label className="block text-sm font-semibold text-gray-800">Lehenga Styling Configuration</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Skirt Volume (Ghera)</label>
                            <select
                                value={config.skirtVolume}
                                onChange={(e) => onConfigChange({ skirtVolume: e.target.value })}
                                className={`w-full p-2 text-sm border rounded-lg focus:ring-rose-500 focus:border-rose-500 ${config.skirtVolume === 'Match Reference Image' ? 'bg-purple-50 border-purple-300 text-purple-800 font-medium' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <option value="Match Reference Image">✨ Match Reference Image</option>
                                <option>Standard / Flowy (A-Line)</option>
                                <option>High Volume / Can-Can (Ballgown)</option>
                                <option>Straight Cut (Slim)</option>
                                <option>Mermaid / Fish Cut</option>
                            </select>
                            {config.skirtVolume === 'Match Reference Image' ? (
                                <p className="text-[10px] text-purple-600 mt-1 font-medium">⚡ Will analyze uploaded lehenga images and replicate the skirt silhouette.</p>
                            ) : (
                                <p className="text-[10px] text-gray-400 mt-1">"High Volume" will simulate a stiff Can-Can netting structure underneath.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Dupatta Draping Style</label>
                            <select
                                value={config.drapingStyle}
                                onChange={(e) => onConfigChange({ drapingStyle: e.target.value })}
                                className={`w-full p-2 text-sm border rounded-lg focus:ring-rose-500 focus:border-rose-500 ${config.drapingStyle === 'Match Reference Image' ? 'bg-purple-50 border-purple-300 text-purple-800 font-medium' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <option value="Match Reference Image">✨ Match Reference Image</option>
                                <option>One Side Open (Pinned to Left)</option>
                                <option>Pleated Saree Style (Tucked)</option>
                                <option>Gujarati Style (Seedha Pallu)</option>
                                <option>Double Drape (Head + Shoulder - Bridal)</option>
                                <option>Cape / Cowl Style (Modern)</option>
                                <option>No Dupatta (Skirt + Top only)</option>
                            </select>
                            {config.drapingStyle === 'Match Reference Image' && (
                                <p className="text-[10px] text-purple-600 mt-1 font-medium">⚡ Will analyze uploaded images and replicate the dupatta draping.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Blouse / Choli Cut</label>
                            <select
                                value={config.blouseCut}
                                onChange={(e) => onConfigChange({ blouseCut: e.target.value })}
                                className={`w-full p-2 text-sm border rounded-lg focus:ring-rose-500 focus:border-rose-500 ${config.blouseCut === 'Match Reference Image' ? 'bg-purple-50 border-purple-300 text-purple-800 font-medium' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <option value="Match Reference Image">✨ Match Reference Image</option>
                                <option>Standard (Short Sleeves)</option>
                                <option>Sleeveless / Strappy</option>
                                <option>Off-Shoulder</option>
                                <option>Long Choli / Lacha (Hip length)</option>
                                <option>Peplum Top</option>
                                <option>Full Sleeves (High Neck)</option>
                            </select>
                            {config.blouseCut === 'Match Reference Image' && (
                                <p className="text-[10px] text-purple-600 mt-1 font-medium">⚡ Will analyze uploaded images and replicate the blouse/choli cut.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Realism Toggle */}
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
                                Enable Enhanced Fabric Realism
                            </div>
                            <p className="text-xs text-indigo-700 mt-1">
                                Enhances Zari reflections, embroidery depth, and skirt physics (especially for Can-Can volume).
                            </p>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default LehengaWorkflow;