import React, { useState, useEffect } from 'react';
import ImageUploadSlot from './ImageUploadSlot';
import { SareeImage, FashionCategory, VideoProvider, KlingCameraControl, KlingDuration, VideoPromptSegment } from '../types';
import VideoControls, { categoryTemplates, VideoTemplate } from './VideoControls';
import { analyzeReferenceVideo, generateFashionVideo, extendFashionVideo } from '../services/geminiService';
import { generateKlingVideo, extendKlingVideo, isKlingAvailable, type KlingVideoConfig } from '../services/klingService';
import { FilmIcon } from './icons/FilmIcon';
import { PlayIcon } from './icons/PlayIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { VideoIcon } from './icons/VideoIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CloseIcon } from './icons/CloseIcon';
import { WandIcon } from './icons/WandIcon';

interface VideoStudioProps {
    category: FashionCategory;
    onCategoryChange?: (category: FashionCategory) => void;
}

const VideoStudio: React.FC<VideoStudioProps> = ({ category, onCategoryChange }) => {
    const [sourceImage, setSourceImage] = useState<SareeImage | null>(null);

    // Video Control State
    const [activeTab, setActiveTab] = useState<'template' | 'reference'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>(categoryTemplates[category][0]);
    const [referenceVideo, setReferenceVideo] = useState<File | null>(null);

    // New Input State
    const [templateCustomPrompt, setTemplateCustomPrompt] = useState('');
    const [referenceAdditionalDetails, setReferenceAdditionalDetails] = useState('');

    // Provider State
    const [videoProvider, setVideoProvider] = useState<VideoProvider>('gemini');
    const [klingModel, setKlingModel] = useState('kling-v2-6');
    const [klingDuration, setKlingDuration] = useState<KlingDuration>('5');
    const [klingCameraControl, setKlingCameraControl] = useState<KlingCameraControl | null>(null);
    const [klingWithAudio, setKlingWithAudio] = useState(false);
    const [klingMotionControlEnabled, setKlingMotionControlEnabled] = useState(false);
    const [klingCharacterOrientation, setKlingCharacterOrientation] = useState<'image' | 'video'>('image');

    // Reference Prompt Generation State
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
    const [refPromptSegments, setRefPromptSegments] = useState<VideoPromptSegment[]>([]);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [status, setStatus] = useState('');
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [currentVideoResource, setCurrentVideoResource] = useState<any | null>(null);
    const [currentVideoProvider, setCurrentVideoProvider] = useState<VideoProvider>('gemini');
    const [currentKlingTaskId, setCurrentKlingTaskId] = useState<string | null>(null);
    const [currentKlingVideoId, setCurrentKlingVideoId] = useState<string | null>(null);
    const [currentKlingModel, setCurrentKlingModel] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extension UI State
    const [showExtendInput, setShowExtendInput] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState('');

    // History State
    const [history, setHistory] = useState<{ url: string, resource?: any, klingTaskId?: string, klingVideoId?: string, klingModelUsed?: string, provider: VideoProvider, timestamp: number, name: string }[]>([]);

    // Extension support: only Kling v1.0 and Omni/v3 support extension. v1.5/v1.6/v2.x do NOT.
    // Since we don't offer v1.0 and v3/Omni isn't available on the direct API yet, extension is currently Gemini-only.
    const canExtendKling = false;

    // Update selected template when category changes to avoid invalid template
    useEffect(() => {
        setSelectedTemplate(categoryTemplates[category][0]);
    }, [category]);

    const handleSourceSelect = (file: File | null) => {
        setSourceImage(file ? { file, previewUrl: URL.createObjectURL(file) } : null);
        setCurrentVideoUrl(null);
        setCurrentVideoResource(null);
        setCurrentKlingTaskId(null);
        setShowExtendInput(false);
        setError(null);
    };

    const handleGenerate = async () => {
        if (!sourceImage) return;

        setIsGenerating(true);
        setCurrentVideoUrl(null);
        setCurrentVideoResource(null);
        setCurrentKlingTaskId(null);
        setShowExtendInput(false);
        setError(null);

        try {
            let finalPrompt = "";

            if (activeTab === 'template') {
                finalPrompt = selectedTemplate.prompt;
                if (templateCustomPrompt.trim()) {
                    finalPrompt += `. ${templateCustomPrompt.trim()}`;
                }
            } else if (activeTab === 'reference' && referenceVideo) {
                // Use the first segment prompt if already analyzed, otherwise analyze now
                if (refPromptSegments.length > 0) {
                    finalPrompt = refPromptSegments[0].prompt;
                } else {
                    setStatus("Analyzing Reference Video...");
                    const segments = await analyzeReferenceVideo(referenceVideo);
                    setRefPromptSegments(segments);
                    finalPrompt = segments[0]?.prompt || 'Cinematic fashion showcase.';
                }
                if (referenceAdditionalDetails.trim()) {
                    finalPrompt += `. User Instruction: ${referenceAdditionalDetails.trim()}`;
                }
            }

            // Convert source image to base64
            const reader = new FileReader();
            reader.readAsDataURL(sourceImage.file);
            const base64Image = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
            });

            if (videoProvider === 'kling') {
                // --- Kling AI generation ---
                const klingConfig: KlingVideoConfig = {
                    model: klingModel,
                    mode: 'pro',
                    duration: klingDuration,
                    aspectRatio: '9:16',
                    cameraControl: klingCameraControl,
                    withAudio: klingWithAudio,
                };

                // Motion Control: send reference video directly to Kling
                if (activeTab === 'reference' && referenceVideo && klingMotionControlEnabled) {
                    setStatus('Preparing reference video for motion control...');
                    const videoReader = new FileReader();
                    videoReader.readAsDataURL(referenceVideo);
                    const videoDataUrl = await new Promise<string>((resolve) => {
                        videoReader.onload = () => resolve(videoReader.result as string);
                    });
                    klingConfig.motionControl = {
                        videoDataUrl,
                        characterOrientation: klingCharacterOrientation,
                    };
                    // Use a minimal prompt when motion control is active (video drives the motion)
                    if (!finalPrompt.trim()) {
                        finalPrompt = 'Fashion model performing motion from reference video.';
                    }
                }

                const result = await generateKlingVideo(category, finalPrompt, base64Image, klingConfig, (s) => setStatus(s));
                setCurrentVideoUrl(result.url);
                setCurrentVideoResource(null);
                setCurrentKlingTaskId(result.taskId);
                setCurrentKlingVideoId(result.videoId);
                setCurrentKlingModel(klingModel);
                setCurrentVideoProvider('kling');

                const newEntry = {
                    url: result.url,
                    klingTaskId: result.taskId,
                    klingVideoId: result.videoId,
                    klingModelUsed: klingModel,
                    provider: 'kling' as VideoProvider,
                    timestamp: Date.now(),
                    name: `[Kling] ${activeTab === 'template' ? selectedTemplate.name : 'Custom Reference Video'}`
                };
                setHistory(prev => [newEntry, ...prev]);
            } else {
                // --- Gemini Veo generation ---
                const result = await generateFashionVideo(category, finalPrompt, base64Image, (s) => setStatus(s));
                setCurrentVideoUrl(result.url);
                setCurrentVideoResource(result.videoResource);
                setCurrentKlingTaskId(null);
                setCurrentVideoProvider('gemini');

                const newEntry = {
                    url: result.url,
                    resource: result.videoResource,
                    provider: 'gemini' as VideoProvider,
                    timestamp: Date.now(),
                    name: activeTab === 'template' ? selectedTemplate.name : 'Custom Reference Video'
                };
                setHistory(prev => [newEntry, ...prev]);
            }

        } catch (e: any) {
            setError(e.message || "Failed to generate video.");
        } finally {
            setIsGenerating(false);
            setStatus('');
        }
    };

    const handleExtend = async () => {
        // Determine which provider to use for extension based on current video
        const direction = extensionPrompt.trim() || "Continue the action smoothly";

        setIsExtending(true);
        setShowExtendInput(false);
        setError(null);
        setStatus("Starting Extension...");

        try {
            if (currentVideoProvider === 'kling' && currentKlingVideoId) {
                // --- Kling extension ---
                const klingExtendConfig: KlingVideoConfig = {
                    model: klingModel,
                    mode: 'pro',
                    withAudio: klingWithAudio,
                };
                const result = await extendKlingVideo(currentKlingVideoId, direction, klingExtendConfig, (s) => setStatus(s));
                setCurrentVideoUrl(result.url);
                setCurrentKlingTaskId(result.taskId);
                setCurrentKlingVideoId(result.videoId);
                setCurrentKlingModel(klingModel);
                setExtensionPrompt('');

                const newEntry = {
                    url: result.url,
                    klingTaskId: result.taskId,
                    klingVideoId: result.videoId,
                    klingModelUsed: klingModel,
                    provider: 'kling' as VideoProvider,
                    timestamp: Date.now(),
                    name: `[Kling] Extended: ${activeTab === 'template' ? selectedTemplate.name : 'Custom Video'}`
                };
                setHistory(prev => [newEntry, ...prev]);
            } else if (currentVideoResource) {
                // --- Gemini extension ---
                const result = await extendFashionVideo(currentVideoResource, direction, (s) => setStatus(s));
                setCurrentVideoUrl(result.url);
                setCurrentVideoResource(result.videoResource);
                setExtensionPrompt('');

                const newEntry = {
                    url: result.url,
                    resource: result.videoResource,
                    provider: 'gemini' as VideoProvider,
                    timestamp: Date.now(),
                    name: `Extended: ${activeTab === 'template' ? selectedTemplate.name : 'Custom Video'}`
                };
                setHistory(prev => [newEntry, ...prev]);
            } else {
                throw new Error('No video resource available for extension.');
            }

        } catch (e: any) {
            setError(e.message || "Failed to extend video.");
            setShowExtendInput(true);
        } finally {
            setIsExtending(false);
            setStatus('');
        }
    };

    const handleSelectHistory = (item: { url: string, resource?: any, klingTaskId?: string, klingVideoId?: string, klingModelUsed?: string, provider: VideoProvider }) => {
        setCurrentVideoUrl(item.url);
        setCurrentVideoResource(item.resource || null);
        setCurrentKlingTaskId(item.klingTaskId || null);
        setCurrentKlingVideoId(item.klingVideoId || null);
        setCurrentKlingModel(item.klingModelUsed || null);
        setCurrentVideoProvider(item.provider);
        setShowExtendInput(false);
        setError(null);
    };

    const handleGeneratePromptFromRef = async () => {
        if (!referenceVideo) return;
        setIsAnalyzingRef(true);
        setRefPromptSegments([]);
        try {
            const segments = await analyzeReferenceVideo(referenceVideo);
            setRefPromptSegments(segments);
            // Auto-fill the additional details with the first segment for immediate use
            if (segments.length > 0) {
                setReferenceAdditionalDetails(segments[0].prompt);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to analyze reference video.');
        } finally {
            setIsAnalyzingRef(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-0 md:px-4 lg:px-6">

            {/* Mobile Header Context */}
            <div className="lg:hidden px-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <VideoIcon className="text-rose-600" /> Video Studio ({category})
                </h2>
                <p className="text-gray-500 text-sm mt-1">Transform static photos into cinematic videos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">

                {/* Left Column: Input & Controls (Sticky on Desktop, Scroll on Mobile) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* 0. Category Selector */}
                    {onCategoryChange && (
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex-shrink-0 mx-4 lg:mx-0 flex">
                            <button
                                onClick={() => onCategoryChange('saree')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${category === 'saree' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                Saree
                            </button>
                            <button
                                onClick={() => onCategoryChange('kurti')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${category === 'kurti' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                Kurti
                            </button>
                            <button
                                onClick={() => onCategoryChange('lehenga')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${category === 'lehenga' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                Lehenga
                            </button>
                            <button
                                onClick={() => onCategoryChange('jewelry')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${category === 'jewelry' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                Jewelry
                            </button>
                        </div>
                    )}

                    {/* 1. Source Image Upload */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex-shrink-0 mx-4 lg:mx-0">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span className="bg-rose-100 text-rose-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                            Source Asset
                        </h3>
                        <ImageUploadSlot
                            title="Model Image"
                            description="Upload generated image."
                            isRequired={true}
                            currentImage={sourceImage}
                            onFileSelect={handleSourceSelect}
                        />
                    </div>

                    {/* 2. Video Controls */}
                    <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden flex flex-col mx-4 lg:mx-0">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <span className="bg-rose-100 text-rose-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                                Motion Settings
                            </h3>
                        </div>

                        {/* 
                        Mobile: h-auto to let it grow naturally. 
                        Desktop: h-full to fill the sticky sidebar container. 
                     */}
                        <VideoControls
                            className=""
                            category={category}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            selectedTemplate={selectedTemplate}
                            setSelectedTemplate={setSelectedTemplate}
                            referenceVideo={referenceVideo}
                            setReferenceVideo={setReferenceVideo}
                            isGenerating={isGenerating || isExtending}
                            onGenerate={handleGenerate}
                            error={error}
                            disabled={!sourceImage || (activeTab === 'reference' && !referenceVideo)}
                            customPrompt={templateCustomPrompt}
                            setCustomPrompt={setTemplateCustomPrompt}
                            additionalDetails={referenceAdditionalDetails}
                            setAdditionalDetails={setReferenceAdditionalDetails}
                            videoProvider={videoProvider}
                            setVideoProvider={setVideoProvider}
                            klingModel={klingModel}
                            setKlingModel={setKlingModel}
                            klingDuration={klingDuration}
                            setKlingDuration={setKlingDuration}
                            klingCameraControl={klingCameraControl}
                            setKlingCameraControl={setKlingCameraControl}
                            klingWithAudio={klingWithAudio}
                            setKlingWithAudio={setKlingWithAudio}
                            onGeneratePromptFromRef={handleGeneratePromptFromRef}
                            isAnalyzingRef={isAnalyzingRef}
                            refPromptSegments={refPromptSegments}
                            klingMotionControlEnabled={klingMotionControlEnabled}
                            setKlingMotionControlEnabled={setKlingMotionControlEnabled}
                            klingCharacterOrientation={klingCharacterOrientation}
                            setKlingCharacterOrientation={setKlingCharacterOrientation}
                        />
                    </div>
                </div>

                {/* Right Column: Preview & Output */}
                <div className="lg:col-span-3 flex flex-col gap-6 px-4 lg:px-0 lg:sticky lg:top-24 lg:self-start">

                    {/* Main Preview Player Stage */}
                    <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-800 relative flex flex-col min-h-[400px] sm:min-h-[500px] lg:h-[600px]">

                        {/* Player Header / Toolbar */}
                        <div className="bg-gray-800/80 backdrop-blur-md px-4 py-3 flex flex-wrap gap-2 justify-between items-center border-b border-white/5 z-20">
                            <div className="flex items-center gap-2 text-white/80">
                                <FilmIcon className="w-4 h-4 text-rose-500" />
                                <span className="text-sm font-semibold tracking-wide hidden sm:inline">Production Stage ({category})</span>
                                <span className="text-sm font-semibold tracking-wide sm:hidden">Preview</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Extend Button — Gemini or v1.x Kling only */}
                                {currentVideoUrl && (currentVideoResource || canExtendKling) && !showExtendInput && (
                                    <button
                                        onClick={() => { setShowExtendInput(true); setError(null); }}
                                        disabled={isExtending}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 text-white text-xs font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors shadow-lg"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Extend Scene (+5s)</span>
                                        <span className="sm:hidden">Extend</span>
                                    </button>
                                )}
                                {/* Extension not supported tip for Kling */}
                                {currentVideoUrl && currentVideoProvider === 'kling' && !showExtendInput && (
                                    <span className="text-[10px] text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded-lg cursor-help" title="Kling v2.x doesn't support extension. Only v1.0 and Omni/v3 do. Generate longer initial videos (10s) instead.">
                                        💡 Tip: Use 10s duration
                                    </span>
                                )}
                                {currentVideoUrl && (
                                    <a
                                        href={currentVideoUrl}
                                        download="saree_showcase.mp4"
                                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors shadow-lg"
                                    >
                                        <DownloadIcon />
                                        <span className="hidden sm:inline">Download MP4</span>
                                        <span className="sm:hidden">Save</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Extension Input Overlay */}
                        {showExtendInput && (
                            <div className="bg-indigo-900/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-white/10 flex flex-col gap-3 z-20 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] uppercase font-bold text-indigo-300">
                                        Next Action Description
                                    </label>
                                    <button onClick={() => setShowExtendInput(false)} className="text-gray-400 hover:text-white p-1"><CloseIcon className="w-4 h-4" /></button>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={extensionPrompt}
                                        onChange={(e) => setExtensionPrompt(e.target.value)}
                                        placeholder="e.g. Continue walking, or Turn slowly to the left..."
                                        className="w-full bg-black/40 border border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-400 outline-none placeholder-white/30"
                                        onKeyDown={(e) => e.key === 'Enter' && handleExtend()}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleExtend}
                                        disabled={isExtending}
                                        className="w-full sm:w-auto bg-white text-indigo-900 font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <WandIcon /> Generate
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Video Area */}
                        <div className="relative w-full flex-grow bg-black/50 flex items-center justify-center p-4">
                            {currentVideoUrl ? (
                                <video
                                    key={currentVideoUrl}
                                    src={currentVideoUrl}
                                    controls
                                    autoPlay
                                    loop
                                    className="w-full h-full max-h-[70vh] object-contain rounded-lg"
                                />
                            ) : (
                                <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                                    {sourceImage ? (
                                        <div className="relative w-full max-w-xs aspect-[3/4] rounded-lg overflow-hidden shadow-2xl border border-white/10">
                                            <img src={sourceImage.previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60 blur-sm scale-110" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                {isGenerating || isExtending ? (
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                ) : (
                                                    <PlayIcon className="w-16 h-16 text-white/80 drop-shadow-lg" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center">
                                                <VideoIcon className="w-8 h-8 opacity-40" />
                                            </div>
                                            <p className="font-mono text-sm opacity-50 uppercase tracking-widest text-center">Load Source to Begin</p>
                                        </div>
                                    )}

                                    {/* Status Overlay */}
                                    {(isGenerating || isExtending) && (
                                        <div className="absolute inset-x-0 bottom-4 sm:bottom-10 flex flex-col items-center z-30 pointer-events-none px-4">
                                            <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col items-center border border-white/10 shadow-2xl text-center max-w-sm">
                                                <p className="text-rose-400 font-bold animate-pulse tracking-widest text-xs uppercase mb-2">
                                                    {isExtending ? "Extending Video Scene" : "Rendering In Progress"}
                                                </p>
                                                <p className="text-white font-medium text-sm">{status || "Initializing..."}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Session History Playlist */}
                    {history.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <VideoIcon className="text-rose-600" /> Session History
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                {history.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectHistory(item)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left group hover:shadow-md focus:ring-2 focus:ring-rose-500/50 ${currentVideoUrl === item.url ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200' : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200'}`}
                                    >
                                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                                            <video src={item.url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                                <PlayIcon className="w-6 h-6 text-white drop-shadow-md" />
                                            </div>
                                        </div>
                                        <div className="flex-grow min-w-0 py-1">
                                            <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                            {item.resource && <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded font-medium">Extendable</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoStudio;