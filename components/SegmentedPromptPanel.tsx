import React, { useState } from 'react';
import type { VideoPromptSegment } from '../types';

interface SegmentedPromptPanelProps {
    segments: VideoPromptSegment[];
}

const SegmentedPromptPanel: React.FC<SegmentedPromptPanelProps> = ({ segments }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }
    };

    if (segments.length === 0) return null;

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
                    🎬 Segmented Prompts ({segments.length} segments)
                </label>
            </div>

            {segments.map((seg, i) => (
                <div
                    key={i}
                    className="relative bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between bg-purple-50 px-3 py-2 border-b border-purple-100">
                        <div className="flex items-center gap-2">
                            <span className="bg-purple-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {i + 1}
                            </span>
                            <span className="text-xs font-bold text-purple-700">{seg.label}</span>
                        </div>
                        <button
                            onClick={() => handleCopy(seg.prompt, i)}
                            className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md transition-all ${copiedIndex === i
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                }`}
                        >
                            {copiedIndex === i ? '✓ Copied!' : '📋 Copy'}
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-3 py-2.5 space-y-1.5">
                        <p className="text-sm text-gray-800 leading-relaxed">{seg.prompt}</p>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Camera:</span>
                            <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                                {seg.cameraAction}
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg text-[10px] text-purple-700 leading-relaxed flex gap-1.5">
                <span>💡</span>
                <span><strong>Tip:</strong> Copy the first segment for initial generation, then use extension segments for each +5s extension.</span>
            </div>
        </div>
    );
};

export default SegmentedPromptPanel;
