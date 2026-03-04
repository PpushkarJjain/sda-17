
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PlusIcon } from './icons/PlusIcon';
import { WandIcon } from './icons/WandIcon';
import { analyzeReferenceVideo, generateFashionVideo, extendFashionVideo } from '../services/geminiService';
import VideoControls, { categoryTemplates, VideoTemplate } from './VideoControls';
import { FashionCategory } from '../types';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    startingImage: string;
    category: FashionCategory;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, startingImage, category = 'saree' }) => {
    const [activeTab, setActiveTab] = useState<'template' | 'reference'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>(categoryTemplates[category][0]);
    const [referenceVideo, setReferenceVideo] = useState<File | null>(null);

    // New Input State
    const [templateCustomPrompt, setTemplateCustomPrompt] = useState('');
    const [referenceAdditionalDetails, setReferenceAdditionalDetails] = useState('');

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [status, setStatus] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoResource, setVideoResource] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extension UI State
    const [showExtendInput, setShowExtendInput] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState('');

    // Update template when category changes
    useEffect(() => {
        if (category && categoryTemplates[category]) {
            setSelectedTemplate(categoryTemplates[category][0]);
        }
    }, [category]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        setVideoUrl(null);
        setVideoResource(null);
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
                setStatus("Analyzing Reference Video...");
                const segments = await analyzeReferenceVideo(referenceVideo);
                finalPrompt = segments[0]?.prompt || 'Cinematic fashion showcase.';
                if (referenceAdditionalDetails.trim()) {
                    finalPrompt += `. User Instruction: ${referenceAdditionalDetails.trim()}`;
                }
            }

            const result = await generateFashionVideo(category as 'saree' | 'kurti' | 'jewelry', finalPrompt, startingImage, (s) => setStatus(s));
            setVideoUrl(result.url);
            setVideoResource(result.videoResource);
        } catch (e: any) {
            setError(e.message || "Failed to generate video.");
        } finally {
            setIsGenerating(false);
            setStatus('');
        }
    };

    const handleExtend = async () => {
        if (!videoResource) return;

        const direction = extensionPrompt.trim() || "Continue the action smoothly";

        setIsExtending(true);
        setShowExtendInput(false);
        setError(null);
        setStatus("Starting Extension...");

        try {
            const result = await extendFashionVideo(videoResource, direction, (s) => setStatus(s));
            setVideoUrl(result.url);
            setVideoResource(result.videoResource);
            setExtensionPrompt('');
        } catch (e: any) {
            setError(e.message || "Failed to extend video.");
            setShowExtendInput(true); // Re-show input on error
        } finally {
            setIsExtending(false);
            setStatus('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/10">

                {/* Left: Preview Area */}
                <div className="w-full md:w-1/2 bg-gray-950 relative flex flex-col">
                    <div className="flex-grow flex items-center justify-center p-4 relative overflow-hidden">
                        {videoUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <video
                                    key={videoUrl} // Force re-render on url change
                                    src={videoUrl}
                                    controls
                                    autoPlay
                                    loop
                                    className="max-h-full max-w-full rounded-lg shadow-2xl border border-white/10"
                                />

                                {/* Extension Input Overlay - Positioned over bottom of video area */}
                                {showExtendInput && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-indigo-900/95 backdrop-blur-md p-4 rounded-xl border border-indigo-500/30 shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <label className="text-[10px] uppercase font-bold text-indigo-300">
                                                    Extension Instruction
                                                </label>
                                                <button onClick={() => setShowExtendInput(false)} className="text-gray-400 hover:text-white"><CloseIcon className="w-4 h-4" /></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={extensionPrompt}
                                                    onChange={(e) => setExtensionPrompt(e.target.value)}
                                                    placeholder="e.g. Turn around, zoom in..."
                                                    className="flex-grow bg-black/40 border border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-400 outline-none"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleExtend()}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleExtend}
                                                    className="bg-white text-indigo-900 font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm whitespace-nowrap"
                                                >
                                                    <WandIcon /> Generate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative group w-full h-full flex items-center justify-center">
                                <img src={startingImage} alt="Starting Frame" className="max-h-[75vh] object-contain rounded-lg opacity-40 blur-sm group-hover:blur-none transition-all duration-700" />
                                {(!isGenerating && !isExtending) && <div className="absolute inset-0 flex items-center justify-center"><PlayIcon className="w-20 h-20 text-white/50" /></div>}

                                {(isGenerating || isExtending) && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                                        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4 border border-white/5">
                                            <div className="h-full bg-rose-600 animate-pulse w-full"></div>
                                        </div>
                                        <p className="text-rose-400 font-bold animate-pulse tracking-widest text-xs uppercase mb-2">
                                            {isExtending ? "Extending Video Scene" : "Rendering In Progress"}
                                        </p>
                                        <p className="text-white font-medium text-sm">{status}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer Controls */}
                    {videoUrl && (
                        <div className="p-4 bg-black/50 border-t border-white/10 flex flex-wrap items-center justify-center gap-4">
                            {/* Extend Button */}
                            {videoResource && !showExtendInput && (
                                <button
                                    onClick={() => { setShowExtendInput(true); setError(null); }}
                                    disabled={isExtending}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-gray-500 text-white font-bold py-2 px-6 rounded-full transition-colors shadow-lg text-sm"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    {isExtending ? "Extending..." : "Extend Scene (+5s)"}
                                </button>
                            )}

                            <a href={videoUrl} download="saree-showcase.mp4" className="inline-flex items-center gap-2 bg-white text-black font-bold py-2 px-6 rounded-full hover:bg-gray-200 transition-colors text-sm">
                                Download Promotion Video
                            </a>
                        </div>
                    )}

                    {/* Modal Close Button (Overlay) */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors z-30"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Right: Controls */}
                <div className="w-full md:w-1/2 flex flex-col bg-gray-50 border-l border-gray-200">
                    <VideoControls
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
                        disabled={activeTab === 'reference' && !referenceVideo}
                        customPrompt={templateCustomPrompt}
                        setCustomPrompt={setTemplateCustomPrompt}
                        additionalDetails={referenceAdditionalDetails}
                        setAdditionalDetails={setReferenceAdditionalDetails}
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoModal;
