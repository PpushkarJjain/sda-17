import React from 'react';
import { FilmIcon } from './icons/FilmIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PlayIcon } from './icons/PlayIcon';
import Spinner from './Spinner';
import { FashionCategory } from '../types';

export interface VideoTemplate {
  id: string;
  name: string;
  prompt: string;
}

export const categoryTemplates: Record<FashionCategory, VideoTemplate[]> = {
  saree: [
      { id: 'walk', name: 'Elegant Catwalk', prompt: 'A model walking gracefully towards the camera, the saree fabric flowing beautifully with every step.' },
      { id: 'spin', name: '360° Slow Turn', prompt: 'A cinematic slow-motion 360-degree orbit around the model, highlighting the drape and back-side detailing.' },
      { id: 'reveal', name: 'Pallu Reveal', prompt: 'The model gently lifts and reveals the pallu, focusing on the intricate embroidery and heavy gold work.' },
      { id: 'twirl', name: 'Gentle Twirl', prompt: 'The model performing a gentle twirl in an outdoor garden, showing the volume and movement of the saree skirt.' }
  ],
  kurti: [
      { id: 'walk', name: 'Chic Runway Walk', prompt: 'Confident runway walk, showing the fit and movement of the Kurti.' },
      { id: 'fabric_flow', name: 'Fabric Flow (Wind)', prompt: 'Soft wind blowing to showcase the lightness and texture of the fabric.' },
      { id: 'spin_fast', name: 'Quick Spin', prompt: 'A fun, energetic spin to show the flare of the Anarkali/Kurti.' },
      { id: 'detail_pan', name: 'Vertical Pan', prompt: 'Slow camera pan from bottom hem to neckline, focusing on pattern details.' }
  ],
  lehenga: [
      { id: 'royal_twirl', name: 'Royal Slow Twirl', prompt: 'A slow-motion cinematic twirl showing the massive volume/ghera of the lehenga skirt fanning out completely.' },
      { id: 'bridal_entry', name: 'Bridal Walk', prompt: 'A royal bridal entry walk, slow paced, showcasing the heavy dupatta and intricate embroidery work.' },
      { id: 'dupatta_adjust', name: 'Veil Adjustment', prompt: 'Close up of the model gently adjusting her dupatta veil, highlighting the border work and jewelry.' },
      { id: 'sitting_flare', name: 'Seated Flare', prompt: 'Camera panning around a model seated royally with the lehenga skirt spread out in a perfect circle on the floor.' }
  ],
  jewelry: [
      { id: 'sparkle', name: 'Sparkle & Shine', prompt: 'Slow camera movement to catch the light reflections on the gems and metal. emphasize specular highlights.' },
      { id: 'macro_pan', name: 'Macro Pan', prompt: 'Extreme close-up slow pan across the details of the jewelry piece. Shallow depth of field.' },
      { id: 'breath', name: 'Living Portrait', prompt: 'Subtle model breathing movement to show the jewelry resting naturally on skin. Very realistic.' },
      { id: 'rack_focus', name: 'Rack Focus', prompt: 'Focus shifting slowly from the model\'s eyes to the jewelry piece.' }
  ]
};

interface VideoControlsProps {
  category: FashionCategory;
  activeTab: 'template' | 'reference';
  setActiveTab: (tab: 'template' | 'reference') => void;
  selectedTemplate: VideoTemplate;
  setSelectedTemplate: (t: VideoTemplate) => void;
  referenceVideo: File | null;
  setReferenceVideo: (f: File | null) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
  disabled: boolean;
  customPrompt: string;
  setCustomPrompt: (s: string) => void;
  additionalDetails: string;
  setAdditionalDetails: (s: string) => void;
  className?: string;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  category,
  activeTab,
  setActiveTab,
  selectedTemplate,
  setSelectedTemplate,
  referenceVideo,
  setReferenceVideo,
  isGenerating,
  onGenerate,
  error,
  disabled,
  customPrompt,
  setCustomPrompt,
  additionalDetails,
  setAdditionalDetails,
  className = ""
}) => {
  const templates = categoryTemplates[category] || categoryTemplates['saree'];

  return (
    <div className={`flex flex-col bg-gray-50 ${className}`}>
      <div className="p-4 sm:p-5 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
        {/* Toggle Switches */}
        <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner flex-shrink-0" role="tablist" aria-label="Video Generation Mode">
            <button 
                onClick={() => setActiveTab('template')} 
                role="tab"
                aria-selected={activeTab === 'template'}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${activeTab === 'template' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Templates
            </button>
            <button 
                onClick={() => setActiveTab('reference')} 
                role="tab"
                aria-selected={activeTab === 'reference'}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${activeTab === 'reference' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Reference
            </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[200px]">
            {activeTab === 'template' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                    <div role="group" aria-label="Select Movement Template">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Select Movement ({category})</label>
                        {/* Responsive Grid: 1 col on sidebar, 2 cols on mobile/tablet for better tap targets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                            {templates.map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => setSelectedTemplate(t)} 
                                    className={`px-4 py-3 rounded-xl border text-left transition-all relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-rose-500 ${selectedTemplate.id === t.id ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500/20' : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:shadow-md'}`}
                                >
                                    <h5 className="font-bold text-gray-800 text-sm relative z-10">{t.name}</h5>
                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 italic relative z-10">"{t.prompt}"</p>
                                    {selectedTemplate.id === t.id && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-bl-lg"></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="custom-prompt" className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Custom Description (Optional)</label>
                        <textarea
                            id="custom-prompt"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="e.g. Make it slow motion, focus on the face..."
                            className="w-full p-3 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm h-24 resize-none shadow-sm transition-shadow"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 italic">Appended to the selected template prompt.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Upload Reference</label>
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-white text-center hover:border-rose-400 transition-colors cursor-pointer group relative hover:bg-rose-50/10">
                            <label className="cursor-pointer block w-full h-full outline-none focus-within:ring-2 focus-within:ring-rose-500 rounded-lg">
                                <UploadIcon className="mx-auto w-8 h-8 mb-2 text-gray-300 group-hover:text-rose-400 transition-colors" />
                                <span className="text-xs font-bold text-gray-700 block mb-1 truncate px-2">
                                    {referenceVideo ? referenceVideo.name : 'Choose Video File'}
                                </span>
                                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">MP4 / WEBM</span>
                                <input type="file" accept="video/*" className="hidden" onChange={e => setReferenceVideo(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="additional-details" className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Additional Details (Optional)</label>
                        <textarea
                            id="additional-details"
                            value={additionalDetails}
                            onChange={(e) => setAdditionalDetails(e.target.value)}
                            placeholder="e.g. Keep the lighting dark and moody, ensure the background is blurry..."
                            className="w-full p-3 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm h-24 resize-none shadow-sm transition-shadow"
                        />
                         <p className="text-[10px] text-gray-400 mt-1 italic">Used to guide style alongside the video motion analysis.</p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 leading-relaxed flex gap-2">
                         <span className="text-xl">💡</span>
                         <span><strong>AI Tip:</strong> Ensure your reference video has clear lighting and a steady camera for best results.</span>
                    </div>
                </div>
            )}
        </div>

        {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-bold flex items-start gap-2" role="alert">
                <span className="text-lg leading-none">⚠️</span>
                {error}
            </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-gray-200 bg-white flex-shrink-0">
        <button 
            onClick={onGenerate} 
            disabled={disabled || isGenerating} 
            className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-rose-700 hover:shadow-xl disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all transform active:scale-[0.98] text-sm uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-rose-500/30"
            aria-busy={isGenerating}
        >
            {isGenerating ? <><Spinner /> Producing...</> : <><PlayIcon className="w-4 h-4" /> Generate Video</>}
        </button>
      </div>
    </div>
  );
};

export default VideoControls;