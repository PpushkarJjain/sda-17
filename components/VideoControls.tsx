import React from 'react';
import { FilmIcon } from './icons/FilmIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PlayIcon } from './icons/PlayIcon';
import Spinner from './Spinner';
import { FashionCategory, VideoProvider, KlingCameraControl, KlingDuration, VideoPromptSegment } from '../types';
import { isKlingAvailable } from '../services/klingService';
import SegmentedPromptPanel from './SegmentedPromptPanel';

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
    // Provider selection
    videoProvider: VideoProvider;
    setVideoProvider: (p: VideoProvider) => void;
    // Kling-specific config
    klingModel: string;
    setKlingModel: (m: string) => void;
    klingDuration: KlingDuration;
    setKlingDuration: (d: KlingDuration) => void;
    klingCameraControl: KlingCameraControl | null;
    setKlingCameraControl: (c: KlingCameraControl | null) => void;
    klingWithAudio: boolean;
    setKlingWithAudio: (a: boolean) => void;
    // Reference video prompt generation
    onGeneratePromptFromRef?: () => void;
    isAnalyzingRef?: boolean;
    refPromptSegments?: VideoPromptSegment[];
    // Kling Motion Control
    klingMotionControlEnabled?: boolean;
    setKlingMotionControlEnabled?: (enabled: boolean) => void;
    klingCharacterOrientation?: 'image' | 'video';
    setKlingCharacterOrientation?: (o: 'image' | 'video') => void;
}

const CAMERA_PRESETS = [
    { label: 'None', value: 'none' },
    { label: 'Zoom In', value: 'zoom_in' },
    { label: 'Zoom Out', value: 'zoom_out' },
    { label: 'Pan Left', value: 'pan_left' },
    { label: 'Pan Right', value: 'pan_right' },
    { label: 'Tilt Up', value: 'tilt_up' },
    { label: 'Tilt Down', value: 'tilt_down' },
] as const;

const cameraPresetToControl = (preset: string, intensity: number): KlingCameraControl | null => {
    if (preset === 'none') return null;
    const config: KlingCameraControl['config'] = {};
    switch (preset) {
        case 'zoom_in': config.zoom = intensity; break;
        case 'zoom_out': config.zoom = -intensity; break;
        case 'pan_left': config.horizontal = -intensity; break;
        case 'pan_right': config.horizontal = intensity; break;
        case 'tilt_up': config.vertical = intensity; break;
        case 'tilt_down': config.vertical = -intensity; break;
    }
    return { type: 'simple', config };
};

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
    className = "",
    videoProvider,
    setVideoProvider,
    klingModel,
    setKlingModel,
    klingDuration,
    setKlingDuration,
    klingCameraControl,
    setKlingCameraControl,
    klingWithAudio,
    setKlingWithAudio,
    onGeneratePromptFromRef,
    isAnalyzingRef,
    refPromptSegments,
    klingMotionControlEnabled,
    setKlingMotionControlEnabled,
    klingCharacterOrientation,
    setKlingCharacterOrientation,
}) => {
    const templates = categoryTemplates[category] || categoryTemplates['saree'];
    const klingAvailable = isKlingAvailable();

    // Local state for camera preset UI
    const [cameraPreset, setCameraPreset] = React.useState('none');
    const [cameraIntensity, setCameraIntensity] = React.useState(5);

    return (
        <div className={`flex flex-col bg-gray-50 ${className}`}>
            <div className="p-4 sm:p-5 space-y-6 flex-grow">
                {/* Video Provider Selector */}
                {klingAvailable && (
                    <div className="flex-shrink-0">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Video Provider</label>
                        <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => setVideoProvider('gemini')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${videoProvider === 'gemini' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                ✦ Gemini Veo
                            </button>
                            <button
                                onClick={() => setVideoProvider('kling')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${videoProvider === 'kling' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                ◆ Kling AI
                            </button>
                        </div>
                    </div>
                )}

                {/* Kling-Specific Controls */}
                {videoProvider === 'kling' && (
                    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Kling AI Settings</h4>

                        {/* Model Selection */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Model</label>
                            <select
                                value={klingModel}
                                onChange={e => setKlingModel(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            >
                                <option value="kling-v2-6">Kling v2.6 (Best Quality + Audio)</option>
                                <option value="kling-v2-1">Kling v2.1 (Standard)</option>
                                <option value="kling-v3-0">Kling 3.0 / Omni (Beta — Extensions when available)</option>
                            </select>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Duration</label>
                            <div className="flex bg-white p-1 rounded-lg border border-purple-200">
                                {(['3', '5', '10', '15'] as KlingDuration[]).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setKlingDuration(d)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${klingDuration === d ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {d}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Native Audio Toggle (Kling 3.0 only) */}
                        {(klingModel === 'kling-v3-0' || klingModel === 'kling-v2-6') && (
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Native Audio</label>
                                <button
                                    onClick={() => setKlingWithAudio(!klingWithAudio)}
                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${klingWithAudio ? 'bg-purple-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${klingWithAudio ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        )}

                        {/* Camera Control — hidden when Motion Control is active */}
                        {!klingMotionControlEnabled && (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Camera Movement</label>
                                    <select
                                        value={cameraPreset}
                                        onChange={e => {
                                            const newPreset = e.target.value;
                                            setCameraPreset(newPreset);
                                            setKlingCameraControl(cameraPresetToControl(newPreset, cameraIntensity));
                                        }}
                                        className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    >
                                        {CAMERA_PRESETS.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Intensity Slider (only when camera preset is not 'none') */}
                                {cameraPreset !== 'none' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                            Intensity: <span className="text-purple-600">{cameraIntensity}/10</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1" max="10" step="1"
                                            value={cameraIntensity}
                                            onChange={e => {
                                                const val = parseInt(e.target.value);
                                                setCameraIntensity(val);
                                                setKlingCameraControl(cameraPresetToControl(cameraPreset, val));
                                            }}
                                            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Motion Control — visible when Reference tab active + video uploaded + Kling provider */}
                        {activeTab === 'reference' && referenceVideo && setKlingMotionControlEnabled && (
                            <div className="space-y-3 p-3 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">🎬 Motion Control</label>
                                        <p className="text-[9px] text-gray-500 mt-0.5">Transfer motion from reference video to character</p>
                                    </div>
                                    <button
                                        onClick={() => setKlingMotionControlEnabled(!klingMotionControlEnabled)}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${klingMotionControlEnabled ? 'bg-violet-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${klingMotionControlEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>

                                {klingMotionControlEnabled && setKlingCharacterOrientation && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Character Orientation</label>
                                            <div className="flex bg-white p-1 rounded-lg border border-purple-200">
                                                <button
                                                    onClick={() => setKlingCharacterOrientation('image')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${klingCharacterOrientation === 'image' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    📷 Image (≤10s)
                                                </button>
                                                <button
                                                    onClick={() => setKlingCharacterOrientation('video')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${klingCharacterOrientation === 'video' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    🎥 Video (≤30s)
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-1 italic">
                                                {klingCharacterOrientation === 'image'
                                                    ? '"Image" keeps your character\'s orientation from the source image. Video ≤ 10 seconds.'
                                                    : '"Video" follows the character\'s orientation in the reference video. Video ≤ 30 seconds.'
                                                }
                                            </p>
                                        </div>

                                        <div className="p-2 bg-violet-100 border border-violet-200 rounded-lg text-[10px] text-violet-800 leading-relaxed flex gap-2">
                                            <span className="text-sm">🎯</span>
                                            <span>Reference video motion will be directly applied to your character. Camera controls are disabled in this mode.</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

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

                                {/* Generate Prompt from Reference Button */}
                                {referenceVideo && onGeneratePromptFromRef && (
                                    <button
                                        onClick={onGeneratePromptFromRef}
                                        disabled={isAnalyzingRef}
                                        className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all transform active:scale-[0.98]"
                                    >
                                        {isAnalyzingRef ? (
                                            <><Spinner /> Analyzing Video...</>
                                        ) : (
                                            <>✨ Generate Prompt from Reference</>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Segmented Prompt Results */}
                            {refPromptSegments && refPromptSegments.length > 0 && (
                                <SegmentedPromptPanel segments={refPromptSegments} />
                            )}

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
                    {isGenerating ? <><Spinner /> Producing...</> : <><PlayIcon className="w-4 h-4" /> Generate{videoProvider === 'kling' ? ' (Kling AI)' : ' Video'}</>}
                </button>
            </div>
        </div>
    );
};

export default VideoControls;