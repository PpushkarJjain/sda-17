import React, { useEffect } from 'react';
import ImageUploadSlot from './ImageUploadSlot';
import { ScanIcon } from './icons/ScanIcon';
import Spinner from './Spinner';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SareeImage, FashionCategory } from '../types';

interface CommonControlsProps {
  activeTab: 'draping' | 'refiner' | 'video-studio';
  activeCategory: FashionCategory;
  fidelityMode: 'accurate' | 'marketing';
  referenceImage: SareeImage | null;
  onReferenceFileSelect: (file: File | null) => void;
  onAnalyzeReference: () => void;
  analyzingReference: boolean;
  referenceAnalysis: { pose: string, background: string, model_attributes: string } | null;
  onCopyDescription: (text: string, type: 'pose' | 'bg') => void;
  copyPoseSuccess: boolean;
  copyBgSuccess: boolean;
  lockRefIdentity: boolean;
  setLockRefIdentity: (val: boolean) => void;
  selectedPoses: string[];
  onPoseSelect: (pose: string) => void;
  customPose: string;
  setCustomPose: (val: string) => void;
  background: string;
  setBackground: (val: string) => void;
  customBackground: string;
  setCustomBackground: (val: string) => void;
  visualStyle: string;
  setVisualStyle: (val: string) => void;
  resolution: string;
  setResolution: (val: string) => void;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  additionalDetails: string;
  setAdditionalDetails: (val: string) => void;
  viewMode?: 'model' | 'product'; // For categories that support model/product toggle
}

const categoryPoses: Record<string, string[]> = {
  saree: [
    'Standing Gracefully',
    'Walking Pose',
    'Dancing Pose',
    'Seated Elegantly',
    'Backside Pose',
    'Close-Up Portrait',
    'Match Reference Pose',
    'Custom Pose',
  ],
  kurti: [
    'Standing Casual',
    'Walking Pose',
    'Hands in Pockets',
    'Seated Casual',
    'Side Profile',
    'Close-Up Portrait',
    'Match Reference Pose',
    'Custom Pose',
  ],
  lehenga: [
    'Bridal Standing (Royal)',
    'Lehenga Twirl (Skirt Flare)',
    'Walking with Dupatta Flow',
    'Seated Royal Pose',
    'Looking over Shoulder',
    'Holding Dupatta Veil',
    'Match Reference Pose',
    'Custom Pose'
  ],
  jewelry_model: [
    'Neck & Shoulder (Necklace)',
    'Hand on Cheek (Ring/Bangle)',
    'Ear Profile (Earrings)',
    'Wrist Focus (Bracelets)',
    'Portrait with Hand Gesture',
    'Match Reference Pose',
    'Custom Pose'
  ],
  jewelry_product: [
    'Flat Lay (Top Down)',
    'Floating Product Shot',
    'On Velvet Stand',
    'Dynamic Angle (45°)',
    'Macro Detail (Gem Focus)',
    'Match Reference Composition',
    'Custom Composition'
  ],
  saree_product: [
    'Flat Lay (Full Spread)',
    'Draped on Mannequin (Headless)',
    'Folded Display (Stack)',
    'Hanging Display',
    'Half-Draped (Artistic)',
    'Match Reference Composition',
    'Custom Composition'
  ]
};

const categoryBackgrounds: Record<string, string[]> = {
  saree: [
    'Studio Lighting',
    'Outdoor Garden',
    'Temple',
    'Festive (e.g., Diwali lights)',
    'Wedding Mandap',
    'Luxury Interior'
  ],
  kurti: [
    'Modern Studio (Solid Color)',
    'Urban Street / City',
    'Modern Apartment / Interior',
    'Cafe / Outdoor Seating',
    'Garden / Park'
  ],
  lehenga: [
    'Grand Palace Hall',
    'Royal Wedding Stage',
    'Floral Outdoor Setup',
    'Luxury Hotel Lobby',
    'Heritage Fort / Archway',
    'Studio Bridal Backdrop'
  ],
  jewelry_model: [
    'Blurry Studio Background',
    'Outdoor Golden Hour',
    'Luxury Interior',
    'Plain Pastel Wall',
    'Romantic Bokeh',
    'Dark Moody Atmosphere'
  ],
  jewelry_product: [
    'Luxury Black Velvet',
    'White Marble Surface',
    'Reflective Glass (Dark)',
    'Soft Beige/Nude Tone',
    'Wooden Texture',
    'Solid White (E-commerce)'
  ],
  saree_product: [
    'Luxury Silk/Velvet Surface',
    'White Marble Surface',
    'Solid White (E-commerce)',
    'Wooden Texture',
    'Soft Pastel Gradient',
    'Rich Fabric Backdrop'
  ]
};

const CommonControls: React.FC<CommonControlsProps> = ({
  activeTab,
  activeCategory,
  fidelityMode,
  referenceImage,
  onReferenceFileSelect,
  onAnalyzeReference,
  analyzingReference,
  referenceAnalysis,
  onCopyDescription,
  copyPoseSuccess,
  copyBgSuccess,
  lockRefIdentity,
  setLockRefIdentity,
  selectedPoses,
  onPoseSelect,
  customPose,
  setCustomPose,
  background,
  setBackground,
  customBackground,
  setCustomBackground,
  visualStyle,
  setVisualStyle,
  resolution,
  setResolution,
  aspectRatio,
  setAspectRatio,
  additionalDetails,
  setAdditionalDetails,
  viewMode
}) => {
  
  // Determine the correct key for poses/backgrounds
  let categoryKey = activeCategory as string;
  if (activeCategory === 'jewelry') {
      categoryKey = viewMode === 'product' ? 'jewelry_product' : 'jewelry_model';
  } else if (activeCategory === 'saree') {
      categoryKey = viewMode === 'product' ? 'saree_product' : 'saree';
  }

  const currentPoses = categoryPoses[categoryKey] || categoryPoses['saree'];
  const currentBackgrounds = categoryBackgrounds[categoryKey] || categoryBackgrounds['saree'];

  // Auto-reset background if it's invalid for the current category
  useEffect(() => {
    if (background === 'Custom...') return;
    if (!currentBackgrounds.includes(background)) {
      setBackground(currentBackgrounds[0]);
    }
  }, [categoryKey, background, currentBackgrounds, setBackground]);

  // Determine Reference Image Label
  let referenceLabel = "Style Reference Image";
  let referenceDesc = "For pose, lighting, or background style. The AI will NOT copy the garment from this image.";
  const isProductMode = viewMode === 'product' && (activeCategory === 'jewelry' || activeCategory === 'saree');
  
  if (isProductMode) {
      referenceLabel = "Composition / Lighting Reference";
      referenceDesc = "Upload a photo to mimic its lighting, angle, or background texture. (AI will not copy the product itself).";
  }

  const showIdentityLock = !isProductMode;

  return (
    <>
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <ImageUploadSlot
            title={referenceLabel}
            description={referenceDesc}
            isRequired={false}
            currentImage={referenceImage}
            onFileSelect={onReferenceFileSelect}
        />
        
        {referenceImage && (
            <div className="mt-3 border-t border-amber-200 pt-3">
                    <div className="flex items-center justify-between mb-3">
                    <button 
                        onClick={onAnalyzeReference}
                        disabled={analyzingReference}
                        className="flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                    >
                        {analyzingReference ? <Spinner /> : <ScanIcon className="w-4 h-4" />}
                        {analyzingReference ? "Analyzing..." : "Generate Prompt from Reference"}
                    </button>
                    {copyPoseSuccess && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded animate-in fade-in slide-in-from-left-2">
                            Applied generated pose & background!
                        </span>
                    )}
                    </div>

                    {/* Identity Lock Checkbox (Hidden for Product Mode) */}
                    {showIdentityLock && (
                        <div className="bg-white/50 p-3 rounded-lg border border-amber-200/50 mb-3 animate-in fade-in">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={lockRefIdentity} 
                                onChange={(e) => setLockRefIdentity(e.target.checked)}
                                className="mt-1 w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-800">Preserve Reference Model Identity (Requires Consent)</span>
                                <p className="text-xs text-gray-500 mt-1">
                                    {lockRefIdentity 
                                    ? "⚠️ You are overriding safety protocols. Ensure you have the rights to use this person's likeness commercially." 
                                    : "✅ Recommended: AI will generate a unique, anonymized face to avoid legal issues."}
                                </p>
                            </div>
                        </label>
                        </div>
                    )}
                
                {referenceAnalysis && (
                    <div className="mt-3 bg-white p-3 rounded border border-amber-200 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {isProductMode ? "Composition & Angle" : "Pose Description"}
                                </label>
                                <button
                                    onClick={() => onCopyDescription(referenceAnalysis.pose, 'pose')}
                                    className={`text-xs flex items-center gap-1 font-semibold hover:underline transition-colors ${copyPoseSuccess ? 'text-green-600' : 'text-rose-600'}`}
                                >
                                    <ClipboardIcon className="w-3 h-3" /> 
                                    {copyPoseSuccess ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 max-h-24 overflow-y-auto">
                                {referenceAnalysis.pose}
                            </p>
                        </div>
                        
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Background Description
                                </label>
                                <button
                                    onClick={() => onCopyDescription(referenceAnalysis.background, 'bg')}
                                    className={`text-xs flex items-center gap-1 font-semibold hover:underline transition-colors ${copyBgSuccess ? 'text-green-600' : 'text-rose-600'}`}
                                >
                                    <ClipboardIcon className="w-3 h-3" /> 
                                    {copyBgSuccess ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 max-h-24 overflow-y-auto">
                                {referenceAnalysis.background}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="mt-4 border-t border-rose-100 pt-6 space-y-6">
        
        {/* Pose Selection Guardrail logic */}
        <div className={`transition-opacity ${fidelityMode === 'accurate' && activeTab === 'refiner' ? 'opacity-60' : 'opacity-100'}`}>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
                {activeTab === 'refiner' && fidelityMode === 'accurate' 
                    ? 'Pose (Locked to Repair)' 
                    : (isProductMode ? 'Select Composition Style' : 'Select Model Poses')}
                {!(activeTab === 'refiner' && fidelityMode === 'accurate') && (
                    <span className={`ml-2 text-xs font-medium ${selectedPoses.length >= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                        ({selectedPoses.length}/2 selected)
                    </span>
                )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentPoses.map(pose => {
                const isSelected = selectedPoses.includes(pose);
                const isMatchRef = pose.includes('Match Reference');
                const isDisabledByMax = selectedPoses.length >= 2 && !isSelected;
                const isDisabled = isDisabledByMax || (activeTab === 'refiner' && fidelityMode === 'accurate');
                
                let buttonClass = `text-center p-2 border rounded-lg text-sm transition-colors duration-200 `;
                
                if (isSelected) {
                    buttonClass += isMatchRef 
                        ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                        : 'bg-rose-600 text-white border-rose-600 font-semibold';
                } else if (isDisabledByMax) {
                    buttonClass += 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed';
                } else {
                    buttonClass += isMatchRef
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-100 hover:border-rose-300';
                }

                return (
                    <button
                    key={pose}
                    onClick={() => onPoseSelect(pose)}
                    disabled={isDisabled}
                    className={buttonClass}
                    >
                    {activeTab === 'refiner' && fidelityMode === 'accurate' && isSelected ? 'Subtle Repair' : pose}
                    </button>
                );
            })}
            </div>
            {selectedPoses.includes('Custom Pose') && (
                <div className="mt-2">
                    <input
                        type="text"
                        value={customPose}
                        onChange={(e) => setCustomPose(e.target.value)}
                        placeholder={activeTab === 'draping' ? "e.g., 'leaning against a pillar'" : "Describe custom pose..."}
                        className="w-full p-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                    />
                </div>
            )}
             {selectedPoses.includes('Custom Composition') && (
                <div className="mt-2">
                    <input
                        type="text"
                        value={customPose}
                        onChange={(e) => setCustomPose(e.target.value)}
                        placeholder="e.g. 'Floating in mid-air with water splash'..."
                        className="w-full p-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                    />
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="background-select" className="block text-sm font-semibold text-gray-800 mb-2">
                Background Scene
                </label>
                <select
                id="background-select"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                >
                {currentBackgrounds.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                ))}
                <option value="Custom...">Custom...</option>
                </select>
                {background === 'Custom...' && (
                    <div className="mt-2">
                        <input
                            type="text"
                            value={customBackground}
                            onChange={(e) => setCustomBackground(e.target.value)}
                            placeholder="e.g., 'at a beach during sunset'"
                            className="w-full p-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                        />
                    </div>
                )}
            </div>
            <div>
                <label htmlFor="style-select" className="block text-sm font-semibold text-gray-800 mb-2">
                Visual Style
                </label>
                <select
                id="style-select"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                >
                <option value="Photorealistic">Photorealistic</option>
                <option value="Fashion Magazine">Fashion Magazine</option>
                <option value="Artistic">Artistic</option>
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="resolution-select" className="block text-sm font-semibold text-gray-800 mb-2">
                Image Resolution
                </label>
                <select
                id="resolution-select"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                >
                <option value="Standard">Standard</option>
                <option value="High">High (Pro)</option>
                <option value="Ultra HD">Ultra HD (Pro)</option>
                </select>
            </div>
            <div>
                <label htmlFor="aspect-ratio-select" className="block text-sm font-semibold text-gray-800 mb-2">
                Aspect Ratio
                </label>
                <select
                id="aspect-ratio-select"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
                >
                <option value="1:1">1:1 (Square)</option>
                <option value="3:4">3:4 (Portrait)</option>
                <option value="4:3">4:3 (Landscape)</option>
                <option value="9:16">9:16 (Story)</option>
                <option value="16:9">16:9 (Cinematic)</option>
                </select>
            </div>
        </div>
        
        <div>
            <label htmlFor="additional-details" className="block text-sm font-semibold text-gray-800 mb-2">
                Additional Details (Optional)
            </label>
            <textarea
                id="additional-details"
                rows={4}
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Describe fabric type, desired model ethnicity, etc."
                className="w-full p-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200 text-sm"
            />
        </div>
      </div>
    </>
  );
};

export default CommonControls;