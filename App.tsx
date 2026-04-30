import React, { useState, useCallback, useEffect } from 'react';
import { generateVirtualTryOn, refineGeneratedImage, analyzeReferenceImage, analyzeSareeVisuals, analyzeJewelryVisuals, generateVariation, compressImage, studioRefiner, setActiveApiKey, getActiveApiKeyId, getApiKeyLabels, type ApiKeyId, type VariationConfig, type SareeConfig, type KurtiConfig, type JewelryConfig, type LehengaConfig } from './services/geminiService';
import ImageUploadSlot from './components/ImageUploadSlot';
import ResultDisplay from './components/ResultDisplay';
import Header from './components/Header';
import { SparklesIcon } from './components/icons/SparklesIcon';
import Spinner from './components/Spinner';
import { TrashIcon } from './components/icons/TrashIcon';
import FullScreenViewer from './components/FullScreenViewer';
import { SaveIcon } from './components/icons/SaveIcon';
import { FolderIcon } from './components/icons/FolderIcon';
import { EditIcon } from './components/icons/EditIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { RefreshIcon } from './components/icons/RefreshIcon';
import { VideoIcon } from './components/icons/VideoIcon';
import VariationModal from './components/VariationModal';
import VideoModal from './components/VideoModal';
import VideoStudio from './components/VideoStudio';
import SareeWorkflow from './components/workflows/SareeWorkflow';
import KurtiWorkflow from './components/workflows/KurtiWorkflow';
import JewelryWorkflow from './components/workflows/JewelryWorkflow';
import LehengaWorkflow from './components/workflows/LehengaWorkflow';
import CommonControls from './components/CommonControls';
import PasswordGate from './components/PasswordGate';
import CostTracker from './components/CostTracker';
import type { FashionCategory, SareeImage, SareeImageSet, KurtiImageSet, JewelryImageSet, LehengaImageSet, GeneratedImageItem, SavedPreset, SareeImageType, LehengaImageType } from './types';

// Helper to convert base64 back to file for reconstruction
const base64ToFile = (base64Data: string, filename: string, mimeType: string): File => {
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
};

const MainApp: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'draping' | 'refiner' | 'video-studio'>('draping');
  const [activeCategory, setActiveCategory] = useState<FashionCategory>('saree');

  // API Key Selection State
  const apiKeyOptions = getApiKeyLabels();
  const [selectedKeyId, setSelectedKeyId] = useState<ApiKeyId>(getActiveApiKeyId());

  // --- Category Specific Inputs & Configs ---

  // Saree State
  const [sareeImages, setSareeImages] = useState<SareeImageSet>({
    fullSaree: null, border: null, pallu: null, skirt: null, blouse: null, embroidery: null,
  });
  const [sareeConfig, setSareeConfig] = useState<SareeConfig & { enableEnhancedAnalysis: boolean }>({
    analyzedTextureDescription: '',
    palluStyle: 'Rich Pallu (Grand Zari)',
    designType: 'Weaving Design',
    palluMeasurement: '',
    hasStoneWork: false,
    stoneWorkLocation: 'Border Only',
    jewelleryLevel: 'Keep As Is',
    hasBindi: false,
    enableEnhancedAnalysis: false,
    colorMatchingEnabled: false,
    viewMode: 'model', // Default to Model Showcase
  });

  // Color Matching State
  const [colorSetImage, setColorSetImage] = useState<SareeImage | null>(null);
  const [colorReferenceImage, setColorReferenceImage] = useState<SareeImage | null>(null);

  // Kurti State
  const [kurtiImages, setKurtiImages] = useState<KurtiImageSet>({
    frontView: null, bottoms: null, fabricDetail: null, dupatta: null, secondaryFabricDetail: null
  });
  const [kurtiConfig, setKurtiConfig] = useState<KurtiConfig>({
    subCategory: 'kurti',
    fit: 'Regular Fit',
    sleeveLength: '3/4 Sleeves',
    neckline: 'Round Neck',
    enableEnhancedRealism: false
  });

  // Jewelry State
  const [jewelryImages, setJewelryImages] = useState<JewelryImageSet>({
    productShot: null, mannequinShot: null, sideView: null, topView: null, backView: null
  });
  const [jewelryConfig, setJewelryConfig] = useState<JewelryConfig>({
    type: 'Necklace Set',
    metal: 'Gold',
    fit: 'Standard (Princess)',
    viewMode: 'model', // Default to Model Showcase
    enableEnhancedRealism: false
  });

  // Lehenga State
  const [lehengaImages, setLehengaImages] = useState<LehengaImageSet>({
    fullSet: null, lehengaCloseUp: null, choliCloseUp: null, dupattaCloseUp: null, belt: null
  });
  const [lehengaConfig, setLehengaConfig] = useState<LehengaConfig>({
    skirtVolume: 'Standard / Flowy (A-Line)',
    drapingStyle: 'One Side Open (Pinned to Left)',
    blouseCut: 'Standard (Short Sleeves)',
    enableEnhancedRealism: false
  });

  // --- Studio Refiner Inputs ---
  const [refinerModelPhoto, setRefinerModelPhoto] = useState<SareeImage | null>(null);
  const [refinerSareeDetail, setRefinerSareeDetail] = useState<SareeImage | null>(null);
  const [fidelityMode, setFidelityMode] = useState<'accurate' | 'marketing'>('accurate');
  const [refinerViewMode, setRefinerViewMode] = useState<'model' | 'product'>('model');
  const [modelDescription, setModelDescription] = useState<string>('Professional Indian model, mid-20s, elegant features');

  // --- Shared Config State ---
  const [referenceImage, setReferenceImage] = useState<SareeImage | null>(null);
  const [lockRefIdentity, setLockRefIdentity] = useState<boolean>(false);

  const [selectedPoses, setSelectedPoses] = useState<string[]>(['Standing Gracefully']);
  const [customPose, setCustomPose] = useState<string>('');
  const [background, setBackground] = useState<string>('Studio Lighting');
  const [customBackground, setCustomBackground] = useState<string>('');
  const [visualStyle, setVisualStyle] = useState<string>('Photorealistic');
  const [resolution, setResolution] = useState<string>('Standard');
  const [aspectRatio, setAspectRatio] = useState<string>('3:4');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');

  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [lastBatch, setLastBatch] = useState<GeneratedImageItem[] | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reference Analysis State
  const [analyzingReference, setAnalyzingReference] = useState(false);
  const [referenceAnalysis, setReferenceAnalysis] = useState<{ pose: string, background: string, model_attributes: string } | null>(null);
  const [copyPoseSuccess, setCopyPoseSuccess] = useState(false);
  const [copyBgSuccess, setCopyBgSuccess] = useState(false);
  const [syncModelSuccess, setSyncModelSuccess] = useState(false);

  // Modals
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [selectedImageForVariation, setSelectedImageForVariation] = useState<{ src: string, index: number } | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string | null>(null);

  // Presets State
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isNamingPreset, setIsNamingPreset] = useState(false);
  const [isRenamingPreset, setIsRenamingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  // Load presets
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saree_app_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = Array.isArray(parsed) ? parsed.map((p: any) => ({ ...p, id: String(p.id) })) : [];
        setPresets(sanitized);
      }
    } catch (e) {
      console.error("Failed to load presets", e);
    }
  }, []);

  const handleSareeFileSelect = (type: SareeImageType, selectedFile: File | null) => {
    setSareeImages(prev => ({
      ...prev,
      [type]: selectedFile ? { file: selectedFile, previewUrl: URL.createObjectURL(selectedFile) } : null
    }));
    setGeneratedImages([]);
    setLastBatch(null);
    setError(null);
  };

  const handleKurtiFileSelect = (type: keyof KurtiImageSet, selectedFile: File | null) => {
    setKurtiImages(prev => ({
      ...prev,
      [type]: selectedFile ? { file: selectedFile, previewUrl: URL.createObjectURL(selectedFile) } : null
    }));
    setGeneratedImages([]);
    setLastBatch(null);
    setError(null);
  };

  const handleLehengaFileSelect = (type: keyof LehengaImageSet, selectedFile: File | null) => {
    setLehengaImages(prev => ({
      ...prev,
      [type]: selectedFile ? { file: selectedFile, previewUrl: URL.createObjectURL(selectedFile) } : null
    }));
    setGeneratedImages([]);
    setLastBatch(null);
    setError(null);
  };

  const handleJewelryFileSelect = (type: keyof JewelryImageSet, selectedFile: File | null) => {
    setJewelryImages(prev => ({
      ...prev,
      [type]: selectedFile ? { file: selectedFile, previewUrl: URL.createObjectURL(selectedFile) } : null
    }));
    setGeneratedImages([]);
    setLastBatch(null);
    setError(null);
  };

  const handleReferenceFileSelect = (selectedFile: File | null) => {
    setReferenceImage(selectedFile ? {
      file: selectedFile,
      previewUrl: URL.createObjectURL(selectedFile),
    } : null);
    setGeneratedImages([]);
    setLastBatch(null);
    setReferenceAnalysis(null);
    setError(null);
    setLockRefIdentity(false);
  };

  const handleAnalyzeReference = async () => {
    if (!referenceImage) return;
    setAnalyzingReference(true);
    setReferenceAnalysis(null);
    setError(null);
    try {
      const currentViewMode = activeCategory === 'jewelry' ? jewelryConfig.viewMode : 
                               activeCategory === 'saree' ? sareeConfig.viewMode : undefined;
      const analysis = await analyzeReferenceImage(referenceImage.file, activeCategory, currentViewMode);
      setReferenceAnalysis(analysis);

      // Auto-apply generated descriptions
      if (analysis.pose) {
        setCustomPose(analysis.pose);
        // Use the correct pose name based on current view mode
        const isCurrentlyProductMode = 
          (activeCategory === 'saree' && sareeConfig.viewMode === 'product') ||
          (activeCategory === 'jewelry' && jewelryConfig.viewMode === 'product');
        setSelectedPoses([isCurrentlyProductMode ? 'Custom Composition' : 'Custom Pose']);
      }
      if (analysis.background) {
        setCustomBackground(analysis.background);
        setBackground('Custom...');
      }

      if (analysis.model_attributes && analysis.model_attributes !== "N/A") {
        setModelDescription(analysis.model_attributes);
        setSyncModelSuccess(true);
        setTimeout(() => setSyncModelSuccess(false), 3000);
      }

      // Show success toast for auto-apply
      setCopyPoseSuccess(true); // Re-using existing success state for simplicity, or we can add a new one
      setTimeout(() => setCopyPoseSuccess(false), 3000);

    } catch (e) {
      console.error(e);
      setError("Failed to analyze reference image.");
    } finally {
      setAnalyzingReference(false);
    }
  };

  const handleCopyDescription = async (text: string, type: 'pose' | 'bg') => {
    await navigator.clipboard.writeText(text);
    if (type === 'pose') {
      setCopyPoseSuccess(true);
      setTimeout(() => setCopyPoseSuccess(false), 2000);
    } else {
      setCopyBgSuccess(true);
      setTimeout(() => setCopyBgSuccess(false), 2000);
    }
  };

  const handlePoseSelect = (pose: string) => {
    setSelectedPoses(prev => {
      if (prev.includes(pose)) {
        // For accurate mode in refiner, we force single select in the UI but handle logic here
        if (activeTab === 'refiner' && fidelityMode === 'accurate') return [pose];
        return prev.filter(p => p !== pose);
      }
      if (prev.length < 2) {
        // Same logic
        if (activeTab === 'refiner' && fidelityMode === 'accurate') return [pose];
        return [...prev, pose];
      }
      return prev;
    });
  };

  // --- Preset Handlers (Simplified for brevity, logic identical to before) ---
  const handleSavePresetClick = () => {
    if (selectedPresetId) {
      const current = presets.find(p => p.id === selectedPresetId);
      setPresetNameInput(current ? `Copy of ${current.name}` : `Style Preset ${presets.length + 1}`);
    } else {
      setPresetNameInput(`Style Preset ${presets.length + 1}`);
    }
    setIsNamingPreset(true);
    setIsRenamingPreset(false);
  };

  const handleRenamePresetClick = () => {
    const p = presets.find(p => p.id === selectedPresetId);
    if (p) { setPresetNameInput(p.name); setIsRenamingPreset(true); setIsNamingPreset(false); }
  };

  const handleConfirmRename = () => {
    if (!selectedPresetId || !presetNameInput.trim()) return;
    const newPresets = presets.map(p => p.id === selectedPresetId ? { ...p, name: presetNameInput.trim() } : p);
    try {
      localStorage.setItem('saree_app_presets', JSON.stringify(newPresets));
      setPresets(newPresets);
      setIsRenamingPreset(false);
      setPresetNameInput('');
    } catch (e) { setError("Failed to rename preset."); }
  };

  const handleConfirmSavePreset = async () => {
    if (!presetNameInput.trim()) return;
    let refData = undefined, refMime = undefined;
    if (referenceImage) {
      try {
        const compressed = await compressImage(referenceImage.file, 800);
        refData = compressed.data; refMime = compressed.mimeType;
      } catch (e) { console.error("Failed to compress reference image", e); }
    }
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetNameInput.trim(),
      timestamp: Date.now(),
      referenceData: refData,
      referenceMimeType: refMime,
      config: {
        selectedPoses, customPose, background, customBackground, visualStyle,
        palluStyle: sareeConfig.palluStyle, palluMeasurement: sareeConfig.palluMeasurement,
        designType: sareeConfig.designType, hasStoneWork: sareeConfig.hasStoneWork,
        stoneWorkLocation: sareeConfig.stoneWorkLocation, jewelleryLevel: sareeConfig.jewelleryLevel as any,
        hasBindi: sareeConfig.hasBindi, resolution, aspectRatio, additionalDetails,
        enableEnhancedAnalysis: sareeConfig.enableEnhancedAnalysis,
        enableEnhancedRealism: jewelryConfig.enableEnhancedRealism,
        fidelityMode, modelDescription,
        lockRefIdentity, activeCategory,
        // Lehenga Configs
        skirtVolume: lehengaConfig.skirtVolume,
        drapingStyle: lehengaConfig.drapingStyle,
        blouseCut: lehengaConfig.blouseCut
      }
    };
    try {
      const updatedPresets = [...presets, newPreset];
      localStorage.setItem('saree_app_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      setSelectedPresetId(newPreset.id);
      setIsNamingPreset(false);
    } catch (e) { setError("Failed to save preset. Storage full."); }
  };

  const handleUpdatePreset = async () => {
    if (!selectedPresetId) return;
    const presetIndex = presets.findIndex(p => p.id === selectedPresetId);
    if (presetIndex === -1 || !window.confirm("Update this preset?")) return;

    let refData = undefined, refMime = undefined;
    if (referenceImage) {
      try { const c = await compressImage(referenceImage.file, 800); refData = c.data; refMime = c.mimeType; } catch (e) { }
    }
    const updatedPreset = {
      ...presets[presetIndex], timestamp: Date.now(), referenceData: refData, referenceMimeType: refMime, config: {
        selectedPoses, customPose, background, customBackground, visualStyle,
        palluStyle: sareeConfig.palluStyle, palluMeasurement: sareeConfig.palluMeasurement,
        designType: sareeConfig.designType, hasStoneWork: sareeConfig.hasStoneWork,
        stoneWorkLocation: sareeConfig.stoneWorkLocation, jewelleryLevel: sareeConfig.jewelleryLevel as any,
        hasBindi: sareeConfig.hasBindi, resolution, aspectRatio, additionalDetails,
        enableEnhancedAnalysis: sareeConfig.enableEnhancedAnalysis,
        enableEnhancedRealism: jewelryConfig.enableEnhancedRealism,
        fidelityMode, modelDescription,
        lockRefIdentity, activeCategory,
        // Lehenga Configs
        skirtVolume: lehengaConfig.skirtVolume,
        drapingStyle: lehengaConfig.drapingStyle,
        blouseCut: lehengaConfig.blouseCut
      }
    };
    const newPresets = [...presets]; newPresets[presetIndex] = updatedPreset;
    try { localStorage.setItem('saree_app_presets', JSON.stringify(newPresets)); setPresets(newPresets); } catch (e) { setError("Failed update."); }
  };

  const handleCancelPresetAction = () => { setIsNamingPreset(false); setIsRenamingPreset(false); setPresetNameInput(''); };

  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const c = preset.config;
      setSelectedPoses(c.selectedPoses || ['Standing Gracefully']);
      setCustomPose(c.customPose || ''); setBackground(c.background || 'Studio Lighting');
      setCustomBackground(c.customBackground || ''); setVisualStyle(c.visualStyle || 'Photorealistic');
      setSareeConfig(prev => ({
        ...prev,
        palluStyle: c.palluStyle || prev.palluStyle, palluMeasurement: c.palluMeasurement || '',
        designType: c.designType || prev.designType, hasStoneWork: c.hasStoneWork || false,
        stoneWorkLocation: c.stoneWorkLocation || 'Border Only', jewelleryLevel: c.jewelleryLevel || 'Keep As Is',
        hasBindi: c.hasBindi || false, enableEnhancedAnalysis: c.enableEnhancedAnalysis || false
      }));
      setJewelryConfig(prev => ({ ...prev, enableEnhancedRealism: c.enableEnhancedRealism || false }));
      setLehengaConfig(prev => ({
        ...prev,
        skirtVolume: c.skirtVolume || prev.skirtVolume,
        drapingStyle: c.drapingStyle || prev.drapingStyle,
        blouseCut: c.blouseCut || prev.blouseCut
      }));
      setResolution(c.resolution || 'Standard'); setAspectRatio(c.aspectRatio || '3:4');
      setAdditionalDetails(c.additionalDetails || ''); if (c.fidelityMode) setFidelityMode(c.fidelityMode);
      if (c.modelDescription) setModelDescription(c.modelDescription); setLockRefIdentity(c.lockRefIdentity || false);
      if (c.activeCategory) setActiveCategory(c.activeCategory);

      if (preset.referenceData && preset.referenceMimeType) {
        try {
          const file = base64ToFile(preset.referenceData, "restored-reference.jpg", preset.referenceMimeType);
          setReferenceImage({ file: file, previewUrl: URL.createObjectURL(file) });
          setReferenceAnalysis(null);
        } catch (err) { console.error("Failed to restore reference", err); }
      } else { setReferenceImage(null); setReferenceAnalysis(null); }
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    if (window.confirm("Delete this preset?")) {
      const updated = presets.filter(p => String(p.id) !== String(selectedPresetId));
      setPresets(updated);
      try { localStorage.setItem('saree_app_presets', JSON.stringify(updated)); setSelectedPresetId(''); } catch (e) { }
    }
  };

  // --- Generation Logic ---
  const handleGenerate = useCallback(async () => {
    if (activeTab === 'draping') {
      if (activeCategory === 'saree' && !sareeImages.fullSaree) { setError('Please upload "Full Saree Image".'); return; }
      if (activeCategory === 'kurti' && !kurtiImages.frontView) { setError('Please upload "Front View" for Kurti.'); return; }
      if (activeCategory === 'lehenga' && !lehengaImages.fullSet) { setError('Please upload "Full Set View" for Lehenga.'); return; }
      if (activeCategory === 'jewelry' && !jewelryImages.productShot) { setError('Please upload "Product Shot" for jewelry.'); return; }
      if (selectedPoses.length === 0) { setError('Please select at least one pose.'); return; }
    } else if (activeTab === 'refiner') {
      if (!refinerModelPhoto) { setError('Please upload "Primary Model Photo".'); return; }
      if (fidelityMode === 'marketing' && selectedPoses.length === 0) { setError('Select a pose for Marketing mode.'); return; }
    }

    if (selectedPoses.includes('Match Reference Pose') && !referenceImage) { setError('Upload "Style Reference Image" for matching pose.'); return; }
    if (selectedPoses.includes('Custom Pose') && !customPose.trim()) { setError('Describe the custom pose.'); return; }
    if (background === 'Custom...' && !customBackground.trim()) { setError('Enter custom background description.'); return; }
    if (activeCategory === 'saree' && sareeConfig.colorMatchingEnabled && !colorReferenceImage) { setError('Please upload a "Scene Layout Reference" image for Color Matching mode.'); return; }

    if (generatedImages.length > 0) setLastBatch(generatedImages);
    setIsLoading(true); setError(null); setGeneratedImages([]);

    const backgroundDescription = background === 'Custom...' ? customBackground : background;

    try {
      if (activeTab === 'draping') {
        let textureDescription = "";
        if (activeCategory === 'saree' && sareeConfig.enableEnhancedAnalysis) {
          setLoadingStage('Analyzing fabric details...');
          textureDescription = await analyzeSareeVisuals(sareeImages);
        }

        let jewelryAnalysis = "";
        if (activeCategory === 'jewelry' && jewelryConfig.enableEnhancedRealism) {
          setLoadingStage('Analyzing gemstones & metal physics...');
          jewelryAnalysis = await analyzeJewelryVisuals(jewelryImages);
        }

        setLoadingStage('Generating models...');
        const generationPromises = selectedPoses.map(pose => {
          let poseDescription = pose;
          if (pose === 'Custom Pose' || pose === 'Custom Composition') {
            poseDescription = customPose || pose; // Use customPose text, fallback to pose name
          } else if (pose === 'Match Reference Pose' || pose === 'Match Reference Composition') {
            poseDescription = "Strictly replicate the composition, angle, and posture from the Style Reference Image";
          }

          const coreConfig = {
            poseDescription: `${poseDescription}, in a ${backgroundDescription} setting`,
            additionalDetails, visualStyle, resolution, aspectRatio,
            referenceImage, lockIdentity: lockRefIdentity
          };

          const categoryConfig = {
            saree: { ...sareeConfig, analyzedTextureDescription: textureDescription, colorSetImage, colorReferenceImage },
            kurti: kurtiConfig,
            jewelry: { ...jewelryConfig, analyzedProductDescription: jewelryAnalysis },
            lehenga: lehengaConfig
          };

          return generateVirtualTryOn(activeCategory, { saree: sareeImages, kurti: kurtiImages, jewelry: jewelryImages, lehenga: lehengaImages }, coreConfig, categoryConfig);
        });
        const results = await Promise.all(generationPromises);
        setGeneratedImages(results.map(url => ({ current: url, history: [] })));
      } else {
        // Refiner Logic
        setLoadingStage('Retouching...');
        const genFunc = async (p: string) => studioRefiner(refinerModelPhoto!.file, refinerSareeDetail?.file || null, {
          category: activeCategory, fidelityMode, pose: p, background: backgroundDescription,
          visualStyle, resolution, aspectRatio, modelDescription,
          additionalDetails: `${additionalDetails}. Jewellery: ${sareeConfig.jewelleryLevel}. Bindi: ${sareeConfig.hasBindi ? 'Yes' : 'No'}.`,
          viewMode: refinerViewMode
        });

        if (fidelityMode === 'accurate') {
          const accuratePrompt = refinerViewMode === 'product' ? "Subtle enhancement and cleanup" : "Subtle posture repair";
          const res = await genFunc(accuratePrompt);
          setGeneratedImages([{ current: res, history: [] }]);
        } else {
          const results = await Promise.all(selectedPoses.map(p => {
            let pd = p;
            if (p === 'Custom Pose' || p === 'Custom Composition') {
              pd = customPose || p;
            } else if (p === 'Match Reference Pose' || p === 'Match Reference Composition') {
              pd = "Strictly replicate the composition, angle, and posture from the Style Reference Image";
            }
            return genFunc(pd);
          }));
          setGeneratedImages(results.map(url => ({ current: url, history: [] })));
        }
      }
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : 'Failed to generate. Try again.'); }
    finally { setIsLoading(false); setLoadingStage(''); }
  }, [activeTab, activeCategory, sareeImages, kurtiImages, jewelryImages, lehengaImages, refinerModelPhoto, refinerSareeDetail, fidelityMode, modelDescription, referenceImage, additionalDetails, background, customBackground, selectedPoses, customPose, visualStyle, resolution, aspectRatio, sareeConfig, kurtiConfig, jewelryConfig, lehengaConfig, generatedImages, lockRefIdentity]);

  const handleRefineImage = useCallback(async (imageIndex: number, refinementPrompt: string, resolution: 'Standard' | 'High' | 'Ultra HD') => {
    if (!refinementPrompt.trim()) { setError("Enter refinement instruction."); return; }
    const original = generatedImages[imageIndex]; if (!original) return;
    setRefiningIndex(imageIndex); setError(null);
    try {
      const [header, base64Data] = original.current.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1];
      if (!mimeType) throw new Error("Invalid image data");
      const newImage = await refineGeneratedImage(base64Data, mimeType, refinementPrompt, resolution);
      setGeneratedImages(prev => {
        const newImg = [...prev];
        newImg[imageIndex] = { current: newImage, history: [...prev[imageIndex].history, prev[imageIndex].current] };
        return newImg;
      });
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : 'Refine failed.'); } finally { setRefiningIndex(null); }
  }, [generatedImages]);

  const handleOpenVariation = (index: number) => {
    const item = generatedImages[index];
    if (item) { setSelectedImageForVariation({ src: item.current, index }); setVariationModalOpen(true); }
  };

  const handleGenerateVariation = async (config: VariationConfig) => {
    if (!selectedImageForVariation) return;
    setIsLoading(true); setLoadingStage('Creating variation...'); setError(null);
    try {
      const result = await generateVariation(
        selectedImageForVariation.src,
        activeCategory,
        { saree: sareeImages, kurti: kurtiImages, jewelry: jewelryImages, lehenga: lehengaImages },
        config,
        additionalDetails,
        visualStyle,
        resolution,
        aspectRatio,
        {
          saree: sareeConfig,
          kurti: kurtiConfig,
          jewelry: jewelryConfig,
          lehenga: lehengaConfig
        }
      );
      setGeneratedImages(prev => [...prev, { current: result, history: [] }]);
      setVariationModalOpen(false);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : 'Variation failed.'); } finally { setIsLoading(false); setLoadingStage(''); }
  };

  const handleOpenVideo = (index: number) => {
    const item = generatedImages[index];
    if (item) { setSelectedImageForVideo(item.current); setVideoModalOpen(true); }
  };

  const handleUndo = useCallback((imageIndex: number) => {
    setGeneratedImages(prev => {
      const item = prev[imageIndex];
      if (!item || item.history.length === 0) return prev;
      const history = [...item.history];
      const previous = history.pop();
      const newImgs = [...prev];
      if (previous) newImgs[imageIndex] = { current: previous, history };
      return newImgs;
    });
  }, []);

  const handleUndoBatch = useCallback(() => { if (lastBatch) { setGeneratedImages(lastBatch); setLastBatch(null); } }, [lastBatch]);

  const handleResetForm = useCallback(() => {
    setSareeImages({ fullSaree: null, border: null, pallu: null, skirt: null, blouse: null, embroidery: null });
    setKurtiImages({ frontView: null, bottoms: null, fabricDetail: null, dupatta: null, secondaryFabricDetail: null });
    setLehengaImages({ fullSet: null, lehengaCloseUp: null, choliCloseUp: null, dupattaCloseUp: null, belt: null });
    setJewelryImages({ productShot: null, mannequinShot: null, sideView: null, topView: null, backView: null });
    setRefinerModelPhoto(null); setRefinerSareeDetail(null); setFidelityMode('accurate');
    setReferenceImage(null); setReferenceAnalysis(null); setSelectedPoses(['Standing Gracefully']);
    setCustomPose(''); setBackground('Studio Lighting'); setCustomBackground('');
    setVisualStyle('Photorealistic'); setResolution('Standard'); setAspectRatio('3:4');
    setAdditionalDetails(''); setGeneratedImages([]); setLastBatch(null); setError(null);
    setSelectedPresetId(''); setLockRefIdentity(false);
    // Reset configs
    setSareeConfig(prev => ({ ...prev, palluMeasurement: '', hasStoneWork: false, stoneWorkLocation: 'Border Only', jewelleryLevel: 'Keep As Is', hasBindi: false, enableEnhancedAnalysis: false, colorMatchingEnabled: false, viewMode: 'model' }));
    setColorSetImage(null); setColorReferenceImage(null);
    setJewelryConfig(prev => ({ ...prev, enableEnhancedRealism: false, viewMode: 'model' }));
    setLehengaConfig(prev => ({ ...prev, enableEnhancedRealism: false }));
    setKurtiConfig(prev => ({ ...prev, subCategory: 'kurti', enableEnhancedRealism: false }));
  }, []);

  return (
    <div className="min-h-screen bg-rose-50 text-gray-800 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10 border border-rose-200">

          {/* API Key Selector - only show if multiple keys exist */}
          {apiKeyOptions.length > 1 && (
            <div className="flex items-center justify-end gap-3 mb-4 pb-4 border-b border-gray-100">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">API Key:</label>
              <select
                value={selectedKeyId}
                onChange={(e) => {
                  const newKey = e.target.value as ApiKeyId;
                  setSelectedKeyId(newKey);
                  setActiveApiKey(newKey);
                }}
                className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none cursor-pointer font-medium text-gray-700 min-w-[160px]"
              >
                {apiKeyOptions.map(opt => (
                  <option key={opt.id} value={opt.id} disabled={!opt.available}>
                    {opt.label}{!opt.available ? ' (Not Set)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Navigation Tabs */}
          <div className="flex border-b border-rose-100 mb-8 overflow-x-auto">
            <button onClick={() => setActiveTab('draping')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'draping' ? 'border-rose-600 text-rose-600 bg-rose-50/50' : 'border-transparent text-gray-400 hover:text-rose-400'}`}>
              <SparklesIcon /> Virtual Draping
            </button>
            <button onClick={() => setActiveTab('refiner')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'refiner' ? 'border-rose-600 text-rose-600 bg-rose-50/50' : 'border-transparent text-gray-400 hover:text-rose-400'}`}>
              <RefreshIcon className="w-4 h-4" /> Studio Refiner
            </button>
            <button onClick={() => setActiveTab('video-studio')} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === 'video-studio' ? 'border-rose-600 text-rose-600 bg-rose-50/50' : 'border-transparent text-gray-400 hover:text-rose-400'}`}>
              <VideoIcon className="w-4 h-4" /> Generate Video Studio
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-rose-900">
              {activeTab === 'draping' && 'AI Fashion Studio'}
              {activeTab === 'refiner' && 'Studio-Quality Presentation Refiner'}
              {activeTab === 'video-studio' && 'Commercial Video Production'}
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              {activeTab === 'draping' && 'Virtual try-on for Sarees, Kurtis, and Jewelry. Upload your product, choose a style, and generate realistic results.'}
              {activeTab === 'refiner' && 'Transform basic model photos into professional fashion shoots while preserving garment accuracy.'}
              {activeTab === 'video-studio' && 'Animate your model images into high-end promotional videos for social media.'}
            </p>
          </div>

          {activeTab === 'video-studio' ? (
            <VideoStudio category={activeCategory} onCategoryChange={setActiveCategory} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
              <div className="flex flex-col gap-6">

                {/* Category Selector */}
                {(activeTab === 'draping' || activeTab === 'refiner') && (
                  <>
                    {activeTab === 'refiner' && <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Category</span></div>}
                    <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg mb-4">
                      {['saree', 'kurti', 'lehenga', 'jewelry'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            const c = cat as FashionCategory;
                            setActiveCategory(c);
                            // Smart pose reset on category switch
                            if (c === 'saree') {
                              // Respect the current saree viewMode
                              if (sareeConfig.viewMode === 'product') {
                                setSelectedPoses(['Flat Lay (Full Spread)']);
                              } else {
                                setSelectedPoses(['Standing Gracefully']);
                              }
                            }
                            else if (c === 'kurti') setSelectedPoses(['Standing Casual']);
                            else if (c === 'lehenga') setSelectedPoses(['Bridal Standing (Royal)']);
                            else if (c === 'jewelry') {
                              // Respect the current jewelry viewMode
                              if (jewelryConfig.viewMode === 'product') {
                                setSelectedPoses(['Flat Lay (Top Down)']);
                              } else {
                                setSelectedPoses(['Neck & Shoulder (Necklace)']);
                              }
                            }
                          }}
                          className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${activeCategory === cat ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Preset Manager UI */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold min-w-fit">
                    <FolderIcon className="w-5 h-5" /> <span className="text-sm">Style Presets:</span>
                  </div>
                  {isNamingPreset || isRenamingPreset ? (
                    <div className="flex-grow flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      <input type="text" value={presetNameInput} onChange={(e) => setPresetNameInput(e.target.value)} placeholder="Preset Name" className="flex-grow p-1.5 text-sm bg-white border border-rose-300 rounded focus:ring-2 focus:ring-rose-500 outline-none" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') isRenamingPreset ? handleConfirmRename() : handleConfirmSavePreset(); if (e.key === 'Escape') handleCancelPresetAction(); }} />
                      <button onClick={isRenamingPreset ? handleConfirmRename : handleConfirmSavePreset} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded hover:bg-rose-700 transition-colors">{isRenamingPreset ? 'Rename' : 'Save'}</button>
                      <button onClick={handleCancelPresetAction} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-grow">
                        <select value={selectedPresetId} onChange={handleLoadPreset} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 rounded focus:ring-rose-500">
                          <option value="">-- Load a Configuration --</option>
                          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      {!selectedPresetId ? (
                        <button onClick={handleSavePresetClick} className="p-2 bg-white text-rose-600 border border-rose-200 rounded hover:bg-rose-50 transition-colors flex items-center gap-1" title="Save current settings"><SaveIcon className="w-4 h-4" /><span className="text-xs font-bold hidden sm:inline">Save New</span></button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={handleUpdatePreset} className="p-2 bg-white text-green-600 border border-gray-200 rounded hover:bg-green-50 transition-colors"><SaveIcon className="w-4 h-4" /></button>
                          <button onClick={handleRenamePresetClick} className="p-2 bg-white text-blue-600 border border-gray-200 rounded hover:bg-blue-50 transition-colors"><EditIcon className="w-4 h-4" /></button>
                          <button onClick={handleSavePresetClick} className="p-2 bg-white text-rose-600 border border-gray-200 rounded hover:bg-rose-50 transition-colors"><PlusIcon className="w-4 h-4" /></button>
                          <div className="w-px h-6 bg-gray-300 mx-1"></div>
                          <button onClick={handleDeletePreset} className="p-2 bg-white text-gray-500 border border-gray-200 rounded hover:bg-red-50 hover:text-red-500 transition-colors"><TrashIcon /></button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* === MAIN CONTENT AREAS === */}

                {activeTab === 'draping' && (
                  <>
                    {activeCategory === 'saree' && (
                      <SareeWorkflow
                        images={sareeImages}
                        config={sareeConfig}
                        onImageChange={handleSareeFileSelect}
                        onConfigChange={(updates) => {
                          setSareeConfig(prev => {
                            const newConfig = { ...prev, ...updates };
                            // Intercept View Mode Toggle to auto-switch poses
                            if (updates.viewMode && updates.viewMode !== prev.viewMode) {
                              if (updates.viewMode === 'product') {
                                setSelectedPoses(['Flat Lay (Full Spread)']);
                              } else {
                                setSelectedPoses(['Standing Gracefully']);
                              }
                            }
                            return newConfig;
                          });
                        }}
                        colorSetImage={colorSetImage}
                        colorReferenceImage={colorReferenceImage}
                        onColorSetChange={(file) => setColorSetImage(file ? { file, previewUrl: URL.createObjectURL(file) } : null)}
                        onColorReferenceChange={(file) => setColorReferenceImage(file ? { file, previewUrl: URL.createObjectURL(file) } : null)}
                      />
                    )}
                    {activeCategory === 'kurti' && (
                      <KurtiWorkflow
                        images={kurtiImages}
                        config={kurtiConfig}
                        onImageChange={handleKurtiFileSelect}
                        onConfigChange={(updates) => setKurtiConfig(prev => ({ ...prev, ...updates }))}
                      />
                    )}
                    {activeCategory === 'lehenga' && (
                      <LehengaWorkflow
                        images={lehengaImages}
                        config={lehengaConfig}
                        onImageChange={handleLehengaFileSelect}
                        onConfigChange={(updates) => setLehengaConfig(prev => ({ ...prev, ...updates }))}
                      />
                    )}
                    {activeCategory === 'jewelry' && (
                      <JewelryWorkflow
                        images={jewelryImages}
                        config={jewelryConfig}
                        onImageChange={handleJewelryFileSelect}
                        onConfigChange={(updates) => {
                          setJewelryConfig(prev => {
                            const newConfig = { ...prev, ...updates };
                            // Intercept View Mode Toggle to Fix Ghost Poses
                            if (updates.viewMode && updates.viewMode !== prev.viewMode) {
                              if (updates.viewMode === 'product') {
                                setSelectedPoses(['Flat Lay (Top Down)']);
                              } else {
                                setSelectedPoses(['Neck & Shoulder (Necklace)']);
                              }
                            }
                            return newConfig;
                          });
                        }}
                      />
                    )}
                  </>
                )}

                {activeTab === 'refiner' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Refiner View Mode Toggle */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
                      <button 
                        onClick={() => setRefinerViewMode('model')} 
                        className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all ${refinerViewMode === 'model' ? 'bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold text-sm">Model Photo</span>
                        <span className="text-[10px] opacity-70">Refine Human Model Shot</span>
                      </button>
                      <button 
                        onClick={() => setRefinerViewMode('product')} 
                        className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all ${refinerViewMode === 'product' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold text-sm">Product Photo</span>
                        <span className="text-[10px] opacity-70">Refine Product Shot (No Model)</span>
                      </button>
                    </div>

                    <div className="bg-rose-50 p-4 border border-rose-200 rounded-xl shadow-sm">
                      <ImageUploadSlot 
                        title={refinerViewMode === 'product' ? "Primary Product Photo" : "Primary Model Photo"} 
                        description={refinerViewMode === 'product' ? "Existing product photography image you want to refine and enhance." : "Existing photo of a model wearing the garment you want to refine."} 
                        isRequired={true} currentImage={refinerModelPhoto} onFileSelect={(file) => setRefinerModelPhoto(file ? { file, previewUrl: URL.createObjectURL(file) } : null)} 
                      />
                    </div>
                    <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl">
                      <ImageUploadSlot title={activeCategory === 'jewelry' ? "Macro Detail / Gemstone Close-up" : "Garment Detail / Swatch"} description={activeCategory === 'jewelry' ? "High-res shot of the gems/metal to ensure sparkle accuracy." : "Optional high-res close-up of the border or pattern to anchor texture accuracy."} isRequired={false} currentImage={refinerSareeDetail} onFileSelect={(file) => setRefinerSareeDetail(file ? { file, previewUrl: URL.createObjectURL(file) } : null)} />
                    </div>
                    <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <label className="text-sm font-bold text-gray-800">Enhancement Mode</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button onClick={() => setFidelityMode('accurate')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${fidelityMode === 'accurate' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Product-Accurate</button>
                          <button onClick={() => setFidelityMode('marketing')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${fidelityMode === 'marketing' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Marketing</button>
                        </div>
                      </div>
                      {refinerViewMode === 'model' && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Persistent Model Description</label>
                            {syncModelSuccess && <span className="text-[10px] text-green-600 font-bold animate-pulse">Synced from Reference Image!</span>}
                          </div>
                          <textarea value={modelDescription} onChange={(e) => setModelDescription(e.target.value)} placeholder="e.g., Professional Indian model, elegant features, mid-20s..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-rose-500 text-sm h-24 shadow-inner" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- Common Controls (Pose, Bg, etc) --- */}
                <CommonControls
                  activeTab={activeTab}
                  activeCategory={activeCategory}
                  fidelityMode={fidelityMode}
                  referenceImage={referenceImage}
                  onReferenceFileSelect={handleReferenceFileSelect}
                  onAnalyzeReference={handleAnalyzeReference}
                  analyzingReference={analyzingReference}
                  referenceAnalysis={referenceAnalysis}
                  onCopyDescription={handleCopyDescription}
                  copyPoseSuccess={copyPoseSuccess}
                  copyBgSuccess={copyBgSuccess}
                  lockRefIdentity={lockRefIdentity}
                  setLockRefIdentity={setLockRefIdentity}
                  selectedPoses={selectedPoses}
                  onPoseSelect={handlePoseSelect}
                  customPose={customPose}
                  setCustomPose={setCustomPose}
                  background={background}
                  setBackground={setBackground}
                  customBackground={customBackground}
                  setCustomBackground={setCustomBackground}
                  visualStyle={visualStyle}
                  setVisualStyle={setVisualStyle}
                  resolution={resolution}
                  setResolution={setResolution}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  additionalDetails={additionalDetails}
                  setAdditionalDetails={setAdditionalDetails}
                  viewMode={activeTab === 'refiner' ? refinerViewMode :
                            activeCategory === 'jewelry' ? jewelryConfig.viewMode : 
                            activeCategory === 'saree' ? sareeConfig.viewMode : undefined}
                />

                <div className="p-4 bg-rose-100/60 border border-rose-200 rounded-lg text-sm text-rose-800 mt-6">
                  <p>
                    {activeTab === 'draping'
                      ? 'Providing more images and details helps our AI render a more precise, high-quality visualization of the product.'
                      : 'Our AI will carefully re-map the texture while upgrading the model and scene for a high-end fashion result.'}
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || (activeTab === 'draping' && ((activeCategory === 'saree' && !sareeImages.fullSaree) || (activeCategory === 'kurti' && !kurtiImages.frontView) || (activeCategory === 'lehenga' && !lehengaImages.fullSet) || (activeCategory === 'jewelry' && !jewelryImages.productShot) || selectedPoses.length === 0)) || (activeTab === 'refiner' && (!refinerModelPhoto || (fidelityMode === 'marketing' && selectedPoses.length === 0)))}
                    className="w-full flex items-center justify-center gap-3 bg-rose-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    {isLoading && !refiningIndex && !variationModalOpen ? (
                      <>
                        <Spinner />
                        {loadingStage || "Processing..."}
                      </>
                    ) : (
                      <>
                        <SparklesIcon />
                        {activeTab === 'draping' ? 'Generate Virtual Try-On' : 'Enhance Presentation'}
                      </>
                    )}
                  </button>
                  <button onClick={handleResetForm} className="p-3 text-gray-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-gray-300 hover:border-rose-300" title="Clear all inputs">
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="mt-8 lg:mt-0">
                <ResultDisplay
                  isLoading={isLoading}
                  images={generatedImages}
                  error={error}
                  onRegenerate={handleGenerate}
                  onRefine={handleRefineImage}
                  onUndo={handleUndo}
                  onUndoBatch={handleUndoBatch}
                  canUndoBatch={!!lastBatch}
                  refiningIndex={refiningIndex}
                  onImageClick={(src) => setPreviewImage(src)}
                  onVariation={handleOpenVariation}
                  onVideo={handleOpenVideo}
                />
              </div>
            </div>
          )}
        </div>
        <footer className="text-center text-gray-500 mt-12 text-sm">
          <p>&copy; {new Date().getFullYear()} Saree Draping AI. All Rights Reserved.</p>
        </footer>
      </main>

      <FullScreenViewer imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      {selectedImageForVariation && (
        <VariationModal
          isOpen={variationModalOpen}
          onClose={() => setVariationModalOpen(false)}
          originalImage={selectedImageForVariation.src}
          onGenerate={handleGenerateVariation}
          isLoading={isLoading}
          category={activeCategory}
        />
      )}
      {selectedImageForVideo && (
        <VideoModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          startingImage={selectedImageForVideo}
          category={activeCategory}
        />
      )}
      <CostTracker />
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if password is set in env
  useEffect(() => {
    // If no password set, allow access (or block, but user said "Environment Variable-based password system")
    // If variable is missing, maybe default to open or closed?
    // User said: "Store the password in an environment variable... Grants access only if the password matches"
    // If no env var is set, the gate will compare against undefined.
    // Let's assume if no env var is set, it's open, OR strictly require it.
    // Given "Trial@2026" example, I'll assume it's required.
    // But for dev convenience, if I didn't set it in my local env (which I did in .env.example but maybe not loaded in runtime if not restarted),
    // I should be careful.
    // Actually, I created .env.example, but I didn't set the actual env var in the system.
    // The system provided environment variables are loaded.
    // I cannot set environment variables for the running process easily without restarting.
    // However, I can just use the value I put in .env.example as a fallback or just hardcode the check for now if env is missing?
    // No, user said "not hardcoded".
    // I will use `import.meta.env.VITE_APP_PASSWORD`.
  }, []);

  if (isAuthenticated) {
    return <MainApp />;
  }

  return <PasswordGate onLogin={() => setIsAuthenticated(true)} />;
};

export default App;