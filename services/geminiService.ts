import { GoogleGenAI, Modality } from "@google/genai";
import type { SareeImage, SareeImageSet, KurtiImageSet, JewelryImageSet, LehengaImageSet, FashionCategory } from '../types';
import type { VariationConfig } from '../components/VariationModal';

export type { VariationConfig };

// --- API Key Switcher ---
export type ApiKeyId = 'key1' | 'key2';

const API_KEYS: Record<ApiKeyId, string> = {
  key1: process.env.API_KEY || '',
  key2: process.env.API_KEY_2 || '',
};

let activeKeyId: ApiKeyId = 'key1';

export const setActiveApiKey = (id: ApiKeyId) => {
  activeKeyId = id;
};

export const getActiveApiKeyId = (): ApiKeyId => activeKeyId;

const getActiveApiKey = (): string => {
  const key = API_KEYS[activeKeyId];
  if (!key) throw new Error(`API key "${activeKeyId}" is not configured. Check your .env file.`);
  return key;
};

export const getApiKeyLabels = (): { id: ApiKeyId; label: string; available: boolean }[] => {
  const labels: { id: ApiKeyId; label: string; available: boolean }[] = [
    { id: 'key1', label: (process.env as any).API_KEY_LABEL_1 || 'Key 1', available: !!API_KEYS.key1 },
  ];
  if ((process.env as any).HAS_API_KEY_2 === true || (process.env as any).HAS_API_KEY_2 === 'true') {
    labels.push({ id: 'key2', label: (process.env as any).API_KEY_LABEL_2 || 'Key 2', available: !!API_KEYS.key2 });
  }
  return labels;
};

// Helper to check if a key is selected
export const checkHasApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
    return await win.aistudio.hasSelectedApiKey();
  }
  return true; // Fallback for environments without the aistudio global
};

// Helper to open the key selection dialog
export const openApiKeyDialog = async () => {
  const win = window as any;
  if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
    await win.aistudio.openSelectKey();
  }
};

// Helper to ensure paid API key is selected for Pro models and Veo
const ensurePaidApiKey = async () => {
  const hasKey = await checkHasApiKey();
  if (!hasKey) {
    await openApiKeyDialog();
  }
};

const handleApiError = async (error: any) => {
  const errorMessage = error?.message || String(error);
  const win = window as any;

  if (
    errorMessage.includes("Requested entity was not found") ||
    (errorMessage.includes("Quota exceeded") && errorMessage.includes("limit: 0")) ||
    errorMessage.includes("API key not valid")
  ) {
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
    }
    throw new Error("This action requires a Paid API Key from a billing-enabled project. Please select a valid key from the dialog that just appeared and try again. Billing info: https://ai.google.dev/gemini-api/docs/billing");
  }
  throw error;
};

// Helper to resize and compress images to avoid payload limits
export const compressImage = async (file: File, maxDimension: number): Promise<{ data: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.split(',')[1];
        resolve({
          data: base64Data,
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const fileToGenerativePart = async (file: File, maxDimension: number = 1024) => {
  const compressed = await compressImage(file, maxDimension);
  return {
    inlineData: { data: compressed.data, mimeType: compressed.mimeType },
  };
};

export const analyzeSareeVisuals = async (sareeImages: SareeImageSet): Promise<string> => {
  const apiKey = getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  const prompt = `You are a textile expert. Analyze the provided images of a saree components and generate a concise but highly technical description of its visual properties.
  Focus on:
  1. Fabric Type & Texture (e.g., Silk, Georgette, stiff, flowy, sheen level).
  2. Color Palette (Exact shades).
  3. Motifs & Patterns (e.g., Paisley, Geometric, Zari work).
  4. Border Details (Width, design density).
  5. Pallu Details (Is it a rich heavy pallu or a simple running pallu? Be objective).
  Output a single paragraph description. Do not describe the background or any people, only the saree material.`;
  parts.push({ text: prompt });
  if (sareeImages.fullSaree) parts.push(await fileToGenerativePart(sareeImages.fullSaree.file, 800));
  if (sareeImages.border) parts.push(await fileToGenerativePart(sareeImages.border.file, 800));
  if (sareeImages.pallu) parts.push(await fileToGenerativePart(sareeImages.pallu.file, 800));
  if (sareeImages.embroidery) parts.push(await fileToGenerativePart(sareeImages.embroidery.file, 800));
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
    });
    return response.text || "";
  } catch (error) {
    return handleApiError(error);
  }
};

export const analyzeJewelryVisuals = async (jewelryImages: JewelryImageSet): Promise<string> => {
  const apiKey = getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  const prompt = `You are a GIA-certified Gemologist and Jewelry Designer. Analyze the provided product images and generate a highly technical rendering specification.
  Focus on:
  1. **Gemstones:** Identify the stone (Diamond, Ruby, Emerald, Polki, Kundan?). Describe the Cut (Brilliant, Step, Rose), Clarity, and Color zoning.
  2. **Metal Finish:** High polish, matte, hammered, filigree, or antique finish?
  3. **Setting Style:** Pave, Bezel, Prong, Channel?
  4. **Light Behavior:** How should light interact? (e.g., "High dispersion/fire", "Silky sheen", "Vitreous luster").
  Output a concise paragraph of physical rendering properties.`;

  parts.push({ text: prompt });
  if (jewelryImages.productShot) parts.push(await fileToGenerativePart(jewelryImages.productShot.file, 800));
  if (jewelryImages.sideView) parts.push(await fileToGenerativePart(jewelryImages.sideView.file, 800));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
    });
    return response.text || "";
  } catch (error) {
    return handleApiError(error);
  }
};

export interface VirtualTryOnConfig {
  poseDescription: string;
  additionalDetails: string;
  visualStyle: string;
  resolution: string;
  aspectRatio: string;
  referenceImage: SareeImage | null;
  lockIdentity: boolean;
}

export interface SareeConfig {
  analyzedTextureDescription: string;
  palluStyle: string;
  designType: string;
  palluMeasurement: string;
  hasStoneWork: boolean;
  stoneWorkLocation: string;
  jewelleryLevel: string;
  hasBindi: boolean;
}

export interface KurtiConfig {
  subCategory: 'kurti' | 'suit';
  fit: string;
  sleeveLength: string;
  neckline: string;
  enableEnhancedRealism: boolean;
}

export interface LehengaConfig {
  skirtVolume: string;
  drapingStyle: string;
  blouseCut: string;
  enableEnhancedRealism: boolean;
}

export interface JewelryConfig {
  type: string;
  metal: string;
  fit: string;
  viewMode: 'model' | 'product';
  enableEnhancedRealism?: boolean;
  analyzedProductDescription?: string;
}

export const generateVirtualTryOn = async (
  category: 'saree' | 'kurti' | 'jewelry' | 'lehenga',
  assets: {
    saree?: SareeImageSet;
    kurti?: KurtiImageSet;
    jewelry?: JewelryImageSet;
    lehenga?: LehengaImageSet;
  },
  coreConfig: VirtualTryOnConfig,
  categoryConfig: {
    saree?: SareeConfig;
    kurti?: KurtiConfig;
    jewelry?: JewelryConfig;
    lehenga?: LehengaConfig;
  }
): Promise<string> => {
  const apiKey = getActiveApiKey();

  let modelName = 'gemini-2.5-flash-image';
  const imageConfig: any = { aspectRatio: coreConfig.aspectRatio || '3:4' };

  const isProResolution = coreConfig.resolution === 'High' || coreConfig.resolution === 'Ultra HD';
  const isJewelry = category === 'jewelry';

  // Upgrade to Gemini 3 Pro if High Res OR Jewelry category is active
  if (isProResolution || isJewelry) {
    await ensurePaidApiKey();
    modelName = 'gemini-3-pro-image-preview';

    // Determine Resolution
    if (coreConfig.resolution === 'Ultra HD') {
      imageConfig.imageSize = '4K';
    } else if (coreConfig.resolution === 'High') {
      imageConfig.imageSize = '2K';
    } else if (isJewelry) {
      // FORCE minimum 2K for Jewelry even if "Standard" is selected
      imageConfig.imageSize = '2K';
    } else {
      imageConfig.imageSize = '1K';
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];

  // -- BASE PROMPT CONSTRUCTION --
  let basePrompt: string;
  switch (coreConfig.visualStyle) {
    case 'Fashion Magazine':
      basePrompt = `Generate a high-fashion magazine editorial image. 
        STYLE: Vogue/Harper's Bazaar aesthetic. 
        LIGHTING: Dramatic studio lighting or Golden Hour. 
        VIBE: Sophisticated, confident, trendy color grading. 
        TEXTURE: Hyper-polished skin and fabric.`;
      break;
    case 'Artistic':
      basePrompt = `Generate an artistic and stylized rendering. 
        STYLE: Cinematic and moody. 
        LIGHTING: Soft, diffused, or creative colored gel lighting. 
        COMPOSITION: Creative angles, dreamy atmosphere. 
        FOCUS: Emotion and aesthetic over strict catalog realism.`;
      break;
    default:
      basePrompt = `Generate a hyper-realistic commercial photography image. 
        STYLE: E-commerce catalog standard. 
        LIGHTING: Even, neutral, high-visibility lighting. 
        FOCUS: Maximum product clarity, accurate color, and fabric texture accuracy.`;
      break;
  }

  let prompt = `${basePrompt}\n`;

  // -- CATEGORY SPECIFIC LOGIC --
  // For Jewelry or High Res, allow larger input images to preserve input detail
  const genMaxDim = (isProResolution || isJewelry) ? 2048 : 1536;

  if (category === 'saree' && assets.saree && categoryConfig.saree) {
    const cfg = categoryConfig.saree;
    prompt += `Generate a lifelike female model.\n`; // Explicitly request model for Saree

    // Jewellery Instruction
    let jewelleryInstruction = "";
    if (cfg.jewelleryLevel !== 'None') {
      jewelleryInstruction = `**JEWELLERY STYLING (${cfg.jewelleryLevel.toUpperCase()} INTENSITY):**\n`;
      if (cfg.jewelleryLevel === 'Sober') {
        jewelleryInstruction += `- Style: Minimal, elegant, daily wear.\n- Items: Small earrings (studs/drops), thin delicate chain or necklace, simple bangles.\n- Vibe: Sophisticated and understated.`;
      } else if (cfg.jewelleryLevel === 'Medium') {
        jewelleryInstruction += `- Style: Balanced traditional, festive wear.\n- Items: Statement earrings (Jhumkas/Chandbalis), layered necklace, set of bangles, small Maang Tikka.\n- Vibe: Semi-bridal or grand party look.`;
      } else if (cfg.jewelleryLevel === 'Heavy') {
        jewelleryInstruction += `- Style: Grand Bridal / Royal Heritage.\n- Items: Heavy choker + long necklace (Rani Haar), large earrings, full bangle set, Maang Tikka, Nose ring (Nath), Waist belt (Kamarbandh).\n- Vibe: Opulent wedding look.`;
      }
      jewelleryInstruction += `\n- **Harmony:** Jewellery metal tone (Gold/Silver/Rose Gold) MUST perfectly match the saree's Zari/Border work.`;
    } else {
      jewelleryInstruction = `**JEWELLERY:** Keep jewellery minimal or non-existent unless visible in the reference image.`;
    }

    if (cfg.hasBindi) {
      jewelleryInstruction += `\n- **Face Detail:** Apply a traditional Bindi on the forehead suited to the face shape.`;
    }

    let palluInstruction = cfg.palluStyle.includes("Rich Pallu") ? `**PALLU SPECIFICATION: RICH / GRAND ZARI PALLU** ...` : (cfg.palluStyle.includes("Box Pallu") ? `**PALLU SPECIFICATION: BOX PALLU** ...` : `**PALLU SPECIFICATION: NORMAL C-PALLU** ...`);
    let designTypeInstruction = cfg.designType.includes("Patch Work") ? `**SURFACE EMBELLISHMENT: PATCH WORK** ...` : (cfg.designType.includes("Embroidery") ? `**SURFACE EMBELLISHMENT: EMBROIDERY** ...` : (cfg.designType.includes("Printed") ? `**SURFACE EMBELLISHMENT: PRINTED** ...` : `**SURFACE EMBELLISHMENT: WOVEN / JACQUARD** ...`));
    let stoneWorkInstruction = cfg.hasStoneWork ? `**ADDITIONAL EMBELLISHMENT: SWAROVSKI STONE WORK (ENABLED)** ...` : `**NEGATIVE CONSTRAINT (STONE WORK DISABLED)** ...`;

    prompt += `**CORE OBJECTIVE:** Dress model in specific saree.\n${cfg.analyzedTextureDescription ? `**FABRIC PHYSICS:** ${cfg.analyzedTextureDescription}\n` : ''}\n${palluInstruction}\n${designTypeInstruction}\n${stoneWorkInstruction}\n${jewelleryInstruction}`;

    if (assets.saree.fullSaree) parts.push(await fileToGenerativePart(assets.saree.fullSaree.file, genMaxDim));
    if (assets.saree.border) parts.push(await fileToGenerativePart(assets.saree.border.file, genMaxDim));
    if (assets.saree.pallu) parts.push(await fileToGenerativePart(assets.saree.pallu.file, genMaxDim));

  } else if (category === 'kurti' && assets.kurti && categoryConfig.kurti) {
    const cfg = categoryConfig.kurti;
    prompt += `Generate a lifelike female model.\n`; // Explicitly request model for Kurti

    const isSuit = cfg.subCategory === 'suit';
    const garmentType = isSuit ? "Complete Salwar Kameez / Punjabi Suit" : "Designer Kurti / Tunic";

    prompt += `**CORE OBJECTIVE:** Dress model in the provided ${garmentType}.
      
      **CONSTRUCTION SPECIFICATIONS:**
      - **Type:** ${isSuit ? '3-Piece Set (Top, Bottom, Dupatta)' : 'Single Piece Top (Kurti)'}.
      - **Fit:** ${cfg.fit}.
      - **Sleeve Length:** ${cfg.sleeveLength}.
      - **Neckline:** ${cfg.neckline}.
      
      **STYLING LOGIC:**
      ${isSuit
        ? `- **Bottoms:** Must render the matching bottom wear (Salwar/Patiala/Pants) visible in the reference or described.
           - **Dupatta:** Essential component. Drape it naturally over the shoulder or chest.`
        : `- **Bottoms:** Pair with neutral leggings, jeans, or cigarette pants unless a specific bottom image is provided.
           - **Dupatta:** Optional. Only include if a dupatta image is provided.`}
      
      **FABRIC PRESERVATION (CRITICAL):**
      - **Top/Kurti:** Strictly maintain the pattern, color, and texture from the [Front View] image.
      - **Texture Mapping:**
        - Use [Top Fabric Detail] for the Kurti/Kameez.
        ${assets.kurti.dupatta
        ? `- Use [Secondary Fabric Detail] for the **Dupatta**.`
        : `- Use [Secondary Fabric Detail] for the **Bottoms** (if provided).`}
      
      ${cfg.enableEnhancedRealism ? `**ENHANCED REALISM (ENABLED):**
      - Focus on fabric weight and drape physics.
      - Render intricate embroidery details with high fidelity.
      - Ensure sheer fabrics (like chiffon dupattas) have realistic transparency.` : ''}
      `;

    if (assets.kurti.frontView) parts.push(await fileToGenerativePart(assets.kurti.frontView.file, genMaxDim));
    if (assets.kurti.fabricDetail) {
      prompt += `\n[Image: Top Fabric Detail] - Macro texture for the Kurti/Top.`;
      parts.push(await fileToGenerativePart(assets.kurti.fabricDetail.file, genMaxDim));
    }
    if (assets.kurti.bottoms) {
      prompt += `\n[Image: Bottoms] - Reference for the pants/salwar.`;
      parts.push(await fileToGenerativePart(assets.kurti.bottoms.file, genMaxDim));
    }
    if (assets.kurti.dupatta) {
      prompt += `\n[Image: Dupatta] - Reference for the scarf/stole.`;
      parts.push(await fileToGenerativePart(assets.kurti.dupatta.file, genMaxDim));
    }
    if (assets.kurti.secondaryFabricDetail) {
      prompt += `\n[Image: Secondary Fabric Detail] - Macro texture for ${assets.kurti.dupatta ? 'the Dupatta' : 'the Bottoms'}.`;
      parts.push(await fileToGenerativePart(assets.kurti.secondaryFabricDetail.file, genMaxDim));
    }

  } else if (category === 'lehenga' && assets.lehenga && categoryConfig.lehenga) {
    const cfg = categoryConfig.lehenga;
    prompt += `Generate a lifelike female model.\n`;
    prompt += `**CORE OBJECTIVE:** Dress model in the provided Lehenga Choli (3-piece ethnic set).
      
      **CONSTRUCTION SPECIFICATIONS:**
      - **Skirt Volume:** ${cfg.skirtVolume}. (If "High Volume/Can-Can", render a wide, stiff umbrella flare. If "Flowy", render soft A-line drape).
      - **Draping Style:** ${cfg.drapingStyle}. (Dupatta placement is critical).
      - **Blouse Cut:** ${cfg.blouseCut}.
      
      **STYLING RULES:**
      - **Midriff:** Unless "Long Choli" is selected, the midriff/navel area MUST be realistically visible with accurate skin texture.
      - **Dupatta Logic:**
         - "One Side Open": Pin to left shoulder, loose fall.
         - "Pleated": Neatly pleated on shoulder.
         - "Gujarati": Back to front drape (Seedha Pallu).
         - "Double Drape": Two dupattas (one head, one shoulder) if this is a bridal look.
      `;

    if (cfg.enableEnhancedRealism) {
      prompt += `\n**ENHANCED REALISM (ENABLED):** 
          - Focus heavily on Zari/Embroidery reflection.
          - Render "Can-can" netting structure underneath the skirt if volume is high.
          - Ensure distinct separation between skirt waistband and blouse hem.
          `;
    }

    if (assets.lehenga.fullSet) {
      prompt += `\n[Image: Full Set] - Reference for color coordination and overall look.`;
      parts.push(await fileToGenerativePart(assets.lehenga.fullSet.file, genMaxDim));
    }
    if (assets.lehenga.lehengaCloseUp) {
      prompt += `\n[Image: Skirt Detail] - Use this texture for the Lehenga (Bottom).`;
      parts.push(await fileToGenerativePart(assets.lehenga.lehengaCloseUp.file, genMaxDim));
    }
    if (assets.lehenga.choliCloseUp) {
      prompt += `\n[Image: Blouse Detail] - Use this texture for the Choli (Top).`;
      parts.push(await fileToGenerativePart(assets.lehenga.choliCloseUp.file, genMaxDim));
    }
    if (assets.lehenga.dupattaCloseUp) {
      prompt += `\n[Image: Dupatta Detail] - Use this texture for the Veil/Stole.`;
      parts.push(await fileToGenerativePart(assets.lehenga.dupattaCloseUp.file, genMaxDim));
    }
    if (assets.lehenga.belt) {
      prompt += `\n**ACCESSORY:** Include the provided Kamarbandh/Belt at the waist.`;
      parts.push(await fileToGenerativePart(assets.lehenga.belt.file, genMaxDim));
    }

  } else if (category === 'jewelry' && assets.jewelry && categoryConfig.jewelry) {
    const cfg = categoryConfig.jewelry;

    // Determine Mode based on selection
    const isProductMode = cfg.viewMode === 'product';
    const isModelMode = cfg.viewMode === 'model';

    if (isProductMode) {
      prompt += `**CORE OBJECTIVE:** Professional Jewelry Product Photography (Macro).
          **TASK:** Render the jewelry item in a high-end commercial product shot style.
          **CONSTRAINT:** NO HUMAN MODEL. NO SKIN. Focus entirely on the product and the display surface.
          **CONTEXT:** ${coreConfig.poseDescription}
          `;
    } else {
      prompt += `**CORE OBJECTIVE:** Virtual Jewelry Try-On (On Model).
          **TASK:** Superimpose the provided jewelry piece onto a lifelike human model in the requested pose.
          **REALISM:** Ensure skin texture, pores, and lighting on the skin are hyper-realistic.
          `;
    }

    // Generate Semantic Fit Instructions based on Dropdown Selection
    let fitInstruction = "";
    const lowerFit = cfg.fit.toLowerCase();

    if (lowerFit.includes('choker')) fitInstruction = "Position: Strictly around the middle of the neck, fitting tightly like a choker.";
    else if (lowerFit.includes('collar')) fitInstruction = "Position: Resting at the base of the neck (Collar bone).";
    else if (lowerFit.includes('matinee')) fitInstruction = "Position: Hanging lower, resting on the chest/cleavage.";
    else if (lowerFit.includes('rani haar')) fitInstruction = "Position: Very long necklace, reaching near the waist/navel.";
    else if (lowerFit.includes('studs')) fitInstruction = "Position: Small studs sitting directly on the earlobe. No dangling parts.";
    else if (lowerFit.includes('shoulder dusters')) fitInstruction = "Position: Very long earrings brushing against the shoulders.";
    else if (lowerFit.includes('midi')) fitInstruction = "Position: Worn above the knuckle (Midi Ring).";
    else if (lowerFit.includes('cocktail')) fitInstruction = "Position: Oversized statement ring covering a significant portion of the finger.";
    else if (lowerFit.includes('armlet')) fitInstruction = "Position: Worn on the upper arm (Bicep/Vanki).";
    else if (lowerFit.includes('bridal nath')) fitInstruction = "Position: Large nose ring connected by a decorative chain to the hair/ear.";
    else if (lowerFit.includes('matha patti')) fitInstruction = "Position: Forehead ornament with bands running along the hairline.";
    else fitInstruction = `Position: Standard fit for ${cfg.type}.`;

    prompt += `
      **JEWELRY SPECS:**
      - **Type:** ${cfg.type}
      - **Metal/Material:** ${cfg.metal}
      - **Fit/Style:** ${cfg.fit}
      
      **PLACEMENT & PHYSICS INSTRUCTION:**
      ${fitInstruction}
      `;

    if (cfg.analyzedProductDescription) {
      prompt += `
          **GEMOLOGICAL & METALLURGICAL ANALYSIS:**
          ${cfg.analyzedProductDescription}
          
          **PHYSICS-BASED LIGHT RENDERING INSTRUCTIONS (MANDATORY):**
          1. **Light Transport:** Enable full spectral dispersion (fire) for diamonds.
          2. **Refraction:** Accurate refractive index for colored gemstones.
          3. **Metal Physics:** Anisotropic reflections for brushed metals, high specular caustics for polished gold/silver.
          4. **Surface:** Micro-details, prong settings, and slight surface imperfections for realism.
          `;
    } else {
      prompt += `
          **CRITICAL 3D RECONSTRUCTION INSTRUCTIONS:**
          1. **Input Analysis:** You have been provided with one or more angles of the product. Use ALL of them to understand the 3D geometry.
          2. **Placement:** ${isProductMode ? 'Place the item artistically on the surface described in background.' : 'Position the item perfectly according to the Fit/Style instruction above. Gravity must be realistic.'}
          3. **Lighting Integration:** The metal and stones must reflect the scene's lighting (specular highlights).
          `;
    }

    if (assets.jewelry.productShot) {
      prompt += `\n[Image: Main Product Shot] - Primary reference for design and color.`;
      parts.push(await fileToGenerativePart(assets.jewelry.productShot.file, genMaxDim));
    }
    if (assets.jewelry.mannequinShot) {
      prompt += `\n[Image: Scale Reference] - Reference for size relative to body.`;
      parts.push(await fileToGenerativePart(assets.jewelry.mannequinShot.file, genMaxDim));
    }
    if (assets.jewelry.sideView) {
      prompt += `\n[Image: Side Profile] - Critical for understanding height, thickness, and setting details.`;
      parts.push(await fileToGenerativePart(assets.jewelry.sideView.file, genMaxDim));
    }
    if (assets.jewelry.topView) {
      prompt += `\n[Image: Top View] - Critical for understanding stone shape and overhead geometry.`;
      parts.push(await fileToGenerativePart(assets.jewelry.topView.file, genMaxDim));
    }
    if (assets.jewelry.backView) {
      prompt += `\n[Image: Back/Inside View] - Reference for structural details.`;
      parts.push(await fileToGenerativePart(assets.jewelry.backView.file, genMaxDim));
    }
  }

  // -- COMMON PARAMS --
  let resolutionInstruction = coreConfig.resolution === 'Standard' ? 'Ensure standard clear resolution.' : `**RESOLUTION & CLARITY (CRITICAL):** Ensure ${coreConfig.resolution} resolution with macro-level detail. NO BLURRINESS.`;

  prompt += `\n**POSE:** ${coreConfig.poseDescription}\n${resolutionInstruction}`;

  // IDENTITY PROTECTION / LEGAL COMPLIANCE / REFERENCE LOGIC
  if (coreConfig.referenceImage) {
    if (coreConfig.lockIdentity) {
      prompt += `\n\n**IDENTITY INSTRUCTION:** The user has explicitly requested to preserve the facial identity of the model in the reference image. Try to maintain resemblance while applying the new fashion item naturally.`;
    } else {
      prompt += `\n\n**REFERENCE IMAGE USAGE PROTOCOL (STRICT):**
        The user has provided a "Style Reference Image" (see below).
        
        **1. STYLE ONLY:** Use this image ONLY to extract:
           - Lighting (e.g. Softbox, Moody, Day light)
           - Background (e.g. Velvet texture, Marble, Gradient)
           - Camera Angle (e.g. Top-down, Macro, Eye-level)
           - Composition (e.g. Rule of thirds, Center focus)
        
        **2. ANTI-LEAKAGE (CRITICAL):**
           - **DO NOT COPY THE PRODUCT** shown in the reference image.
           - **DO NOT COPY THE FACE** shown in the reference image (generate a unique, anonymized face).
           - The Subject/Product must come STRICTLY from the "Input Analysis" images provided earlier.
           
        **3. GOAL:** Render the [INPUT PRODUCT] inside the [REFERENCE STYLE ENVIRONMENT].`;
    }
  }

  parts.push({ text: prompt });
  if (coreConfig.referenceImage) {
    parts.push({ text: "**[IMAGE: STYLE REFERENCE] (USE FOR LIGHTING/ANGLE ONLY):**" });
    parts.push(await fileToGenerativePart(coreConfig.referenceImage.file, genMaxDim));
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE], imageConfig: imageConfig },
    });
    if (!response.candidates || response.candidates.length === 0) throw new Error("No candidates returned. The request might have been blocked.");
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (error) {
    return handleApiError(error);
  }
  throw new Error("No image generated.");
};

export const studioRefiner = async (
  modelPhoto: File,
  detailShot: File | null,
  config: {
    category: 'saree' | 'kurti' | 'jewelry' | 'lehenga',
    fidelityMode: 'accurate' | 'marketing',
    pose: string,
    background: string,
    visualStyle: string,
    resolution: string,
    aspectRatio: string,
    modelDescription: string,
    additionalDetails: string
  }
): Promise<string> => {
  const apiKey = getActiveApiKey();
  await ensurePaidApiKey();
  const modelName = 'gemini-3-pro-image-preview';
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];

  // Context-aware prompt construction
  let categoryInstruction = "";
  if (config.category === 'jewelry') {
    categoryInstruction = "CATEGORY: JEWELRY. Focus on high-frequency details: metallic luster, gemstone refraction, caustics, and realistic skin shadows. Maintain exact geometry.";
  } else if (config.category === 'kurti') {
    categoryInstruction = "CATEGORY: KURTI/ETHNIC WEAR. Focus on fabric weight, stitching details, embroidery texture, and natural cloth folds.";
  } else if (config.category === 'lehenga') {
    categoryInstruction = "CATEGORY: LEHENGA CHOLI. Focus on the volume of the skirt (Ghera), intricate embroidery on the blouse, and the natural fall of the dupatta. Maintain the 3-piece structure.";
  } else {
    categoryInstruction = "CATEGORY: SAREE. Focus on silk/zari texture sheen, pleat physics, and heavy drape realism.";
  }

  // Note: Studio Refiner INTENTIONALLY preserves the model identity as it's assumed the user owns the source photo.
  let basePrompt = `You are a high-end fashion retouching expert. 
  ${categoryInstruction}
  Mode: ${config.fidelityMode.toUpperCase()}. 
  Style: ${config.visualStyle}. 
  Model: ${config.modelDescription}. 
  Bg: ${config.background}. 
  ${config.additionalDetails}`;

  parts.push({ text: basePrompt });
  parts.push(await fileToGenerativePart(modelPhoto, 2048));
  if (detailShot) parts.push(await fileToGenerativePart(detailShot, 2048));
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.resolution === 'Standard' ? '1K' : (config.resolution === 'High' ? '2K' : '4K')
        }
      },
    });
    if (!response.candidates || response.candidates.length === 0) throw new Error("No candidates returned. The request might have been blocked.");
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (error) {
    return handleApiError(error);
  }
  throw new Error("No image generated.");
};

export const refineGeneratedImage = async (
  base64ImageData: string,
  mimeType: string,
  refinementPrompt: string,
  resolution: 'Standard' | 'High' | 'Ultra HD' = 'Standard',
  referenceBase64Data?: string,
  referenceMimeType?: string
): Promise<string> => {
  const apiKey = getActiveApiKey();

  let modelName = 'gemini-2.5-flash-image';
  const imageConfig: any = { aspectRatio: '3:4' }; // Default aspect ratio, though refine usually respects input. 
  // Note: For refine, we might want to preserve input aspect ratio, but the API might require one. 
  // gemini-2.5-flash-image doesn't strictly enforce aspect ratio on edit if not provided, but gemini-3-pro might.
  // However, let's stick to the requested logic: Model switching based on resolution.

  if (resolution === 'High' || resolution === 'Ultra HD') {
    await ensurePaidApiKey();
    modelName = 'gemini-3-pro-image-preview';
    imageConfig.imageSize = resolution === 'Ultra HD' ? '4K' : '2K';
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [{ inlineData: { data: base64ImageData, mimeType: mimeType } }];
  if (referenceBase64Data) parts.push({ inlineData: { data: referenceBase64Data, mimeType: referenceMimeType || 'image/jpeg' } });

  // For Pro model, we can be more descriptive about quality in the prompt
  const qualityInstruction = (resolution === 'High' || resolution === 'Ultra HD')
    ? " Maintain Ultra High Definition details, fabric texture, and sharpness."
    : "";

  parts.push({ text: `Modify image: ${refinementPrompt}. Preserve realism.${qualityInstruction}` });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: parts },
      config: {
        responseModalities: [Modality.IMAGE],
        // Only pass imageConfig if using Pro model or if we want to enforce aspect ratio (which we might not want to force here to avoid cropping)
        // But gemini-3-pro-image-preview might require imageConfig for resolution.
        ...(modelName === 'gemini-3-pro-image-preview' ? { imageConfig } : {})
      },
    });
    if (!response.candidates || response.candidates.length === 0) throw new Error("No candidates returned. The request might have been blocked.");
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (error) {
    return handleApiError(error);
  }
  throw new Error("No image generated.");
};

export const generateInpainting = async (
  originalBase64: string,
  maskBase64: string,
  prompt: string,
  referenceElement?: File | null
): Promise<string> => {
  const apiKey = getActiveApiKey();
  await ensurePaidApiKey();

  const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const originalImg = await loadImg(originalBase64);
  const maskImg = await loadImg(maskBase64);

  const w = originalImg.width;
  const h = originalImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(maskImg, 0, 0);
  const pixels = ctx.getImageData(0, 0, w, h).data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = pixels[(y * w + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) throw new Error("No mask area detected. Please paint over the area you want to edit.");

  const padding = Math.max(50, Math.max(maxX - minX, maxY - minY) * 0.2);
  const cropX = Math.max(0, Math.floor(minX - padding));
  const cropY = Math.max(0, Math.floor(minY - padding));
  const cropW = Math.min(w - cropX, Math.ceil((maxX - minX) + padding * 2));
  const cropH = Math.min(h - cropY, Math.ceil((maxY - minY) + padding * 2));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) throw new Error("Crop canvas failed");

  cropCtx.drawImage(originalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const croppedImageBase64 = cropCanvas.toDataURL('image/jpeg', 0.95);

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [
    { inlineData: { data: croppedImageBase64.split(',')[1], mimeType: 'image/jpeg' } },
    { text: `Edit this image segment. Focus ONLY on the center area. ${prompt}. Maintain seamless edges.` }
  ];

  if (referenceElement) {
    parts.push(await fileToGenerativePart(referenceElement, 1024));
    parts.push({ text: "Use the pattern/texture from the provided reference image." });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE],
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  if (!response.candidates || response.candidates.length === 0) throw new Error("No candidates returned. The request might have been blocked.");

  let generatedCropBase64 = "";
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      generatedCropBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!generatedCropBase64) throw new Error("AI failed to return an image edit.");

  const generatedCropImg = await loadImg(generatedCropBase64);

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(originalImg, 0, 0);

  ctx.drawImage(generatedCropImg, 0, 0, generatedCropImg.width, generatedCropImg.height, cropX, cropY, cropW, cropH);

  return canvas.toDataURL('image/jpeg', 0.95);
};


export const analyzeReferenceImage = async (
  file: File,
  category: FashionCategory = 'saree',
  jewelryMode?: 'product' | 'model'
): Promise<{ pose: string, background: string, model_attributes: string }> => {
  const apiKey = getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file, 800);

  let prompt = "";

  if (category === 'jewelry') {
    if (jewelryMode === 'product') {
      prompt = `Analyze this product photography image and return JSON.
          Focus on the PHOTOGRAPHY STYLE.
          
          {
            "pose": "Describe the camera angle (e.g. Macro, Top-down, 45-degree), Composition (Rule of thirds, Center), and Placement (e.g. Floating, On velvet).",
            "background": "Describe the surface material, lighting style (e.g. Softbox, Hard rim light), and background color/texture.",
            "model_attributes": "N/A"
          }`;
    } else {
      prompt = `Analyze this fashion photography image and return JSON.
          Focus on the MODEL and POSE.
          
          {
            "pose": "Describe the model's pose and how the jewelry is displayed (e.g. Hand on cheek showing ring).",
            "background": "Describe the scene/environment.",
            "model_attributes": "Describe model ethnicity, skin tone, and features."
          }`;
    }
  } else {
    prompt = `Analyze image and return JSON: { "pose": "Describe the model's pose...", "background": "Describe the scene...", "model_attributes": "Describe model features..." }`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, imagePart] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateVariation = async (
  originalImageSrc: string,
  sareeImages: SareeImageSet,
  config: VariationConfig,
  baseAdditionalDetails: string,
  visualStyle: string,
  resolution: string,
  aspectRatio: string,
  palluStyle: string,
  designType: string,
  palluMeasurement: string,
  hasStoneWork: boolean,
  stoneWorkLocation: string
): Promise<string> => {

  if (config.maskData) {
    const prompt = config.sareeEditPrompt + (config.sareeColor ? ` Change color to ${config.sareeColor}.` : "");
    return generateInpainting(originalImageSrc, config.maskData, prompt, config.elementReferenceImage);
  }

  if (config.locks.saree && !config.locks.model) {
    return generateVirtualTryOn(
      'saree',
      { saree: sareeImages },
      {
        poseDescription: config.pose,
        additionalDetails: baseAdditionalDetails,
        visualStyle: visualStyle,
        resolution: resolution,
        aspectRatio: aspectRatio,
        referenceImage: config.referenceImage ? { file: config.referenceImage, previewUrl: "" } : null,
        lockIdentity: config.lockIdentity
      },
      {
        saree: {
          analyzedTextureDescription: "",
          palluStyle: palluStyle,
          designType: designType,
          palluMeasurement: palluMeasurement,
          hasStoneWork: hasStoneWork,
          stoneWorkLocation: stoneWorkLocation,
          jewelleryLevel: 'None',
          hasBindi: false
        }
      }
    );
  }
  if (config.locks.saree && config.locks.model && !config.locks.background) {
    const [, base64Data] = originalImageSrc.split(',');
    return refineGeneratedImage(base64Data, 'image/jpeg', `Change bg to ${config.background}`);
  }
  const [, base64Data] = originalImageSrc.split(',');
  return refineGeneratedImage(base64Data, 'image/jpeg', config.sareeEditPrompt);
};

export const analyzeReferenceVideo = async (videoFile: File): Promise<import('../types').VideoPromptSegment[]> => {
  const apiKey = getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const reader = new FileReader();
  const videoBase64 = await new Promise<string>((resolve) => {
    reader.readAsDataURL(videoFile);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
  });

  const systemPrompt = `You are an expert AI video prompt engineer. Analyze this reference video and break it into 5-second segments for AI video generation.

For each 5-second segment, write a DIRECT, ACTIONABLE generation prompt — NOT a description of what happens.

Rules:
- Each prompt must be a generation instruction, not a narrative description
- Focus on: subject movement, pose transitions, fabric/material behavior, camera motion
- Each extension prompt must start with "Continue smoothly:" and maintain continuity
- Keep lighting, background, and style consistent across all segments
- Use cinematic language: "slow dolly", "tracking shot", "rack focus", etc.
- Each prompt should be 2-3 sentences maximum
- If the video is shorter than 10 seconds, output just 1-2 segments

Return ONLY a valid JSON array (no markdown, no backticks, no explanation), in this exact format:
[
  {"label": "First 5 Seconds", "prompt": "...", "cameraAction": "..."},
  {"label": "Extension 1 (+5s)", "prompt": "Continue smoothly: ...", "cameraAction": "..."},
  {"label": "Extension 2 (+5s)", "prompt": "Continue smoothly: ...", "cameraAction": "..."}
]

The "cameraAction" field should be a short camera instruction like "Slow zoom in", "Pan left to right", "Static wide shot", "Orbit 180°", etc.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: systemPrompt }, { inlineData: { data: videoBase64, mimeType: videoFile.type } }] }]
    });

    const rawText = (response.text || '').trim();

    // Try to parse JSON from the response
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].prompt) {
        return parsed.map((seg: any, i: number) => ({
          label: seg.label || (i === 0 ? 'First 5 Seconds' : `Extension ${i} (+5s)`),
          prompt: seg.prompt || '',
          cameraAction: seg.cameraAction || seg.camera_action || 'Not specified'
        }));
      }
    } catch {
      // JSON parse failed — fall through to fallback
    }

    // Fallback: wrap plain text as a single segment
    return [{
      label: 'First 5 Seconds',
      prompt: rawText || 'Cinematic fashion showcase with smooth motion.',
      cameraAction: 'Smooth tracking shot'
    }];
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateFashionVideo = async (
  category: 'saree' | 'kurti' | 'jewelry' | 'lehenga',
  prompt: string,
  startingImageBase64: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ url: string, videoResource: any }> => {
  const apiKey = getActiveApiKey();
  await ensurePaidApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const [, data] = startingImageBase64.split(',');

  let contextPrefix = "";
  if (category === 'jewelry') {
    contextPrefix = "Cinematic jewelry product shot. Macro video. High luxury. Focus on light reflection on metal and gems.";
  } else if (category === 'kurti') {
    contextPrefix = "Fashion model wearing ethnic Kurti. Modern chic vibe.";
  } else if (category === 'lehenga') {
    contextPrefix = "Fashion model wearing voluminous Lehenga Choli. Grand royal wedding vibe. Focus on skirt flare and embroidery.";
  } else {
    contextPrefix = "Saree showcase. Traditional elegance. Flowing fabric.";
  }

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${contextPrefix} ${prompt}`,
      image: { imageBytes: data, mimeType: 'image/jpeg' },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      onStatusUpdate?.("Processing...");
      operation = await ai.operations.getVideosOperation({ operation });
    }
    const videoResource = operation.response?.generatedVideos?.[0]?.video;
    const finalUrl = `${videoResource?.uri}&key=${apiKey}`;
    const response = await fetch(finalUrl);
    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), videoResource };
  } catch (error) {
    return handleApiError(error);
  }
};

export const extendFashionVideo = async (
  previousVideoResource: any,
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ url: string, videoResource: any }> => {
  const apiKey = getActiveApiKey();
  await ensurePaidApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `Extend: ${prompt}`,
      video: previousVideoResource,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const videoResource = operation.response?.generatedVideos?.[0]?.video;
    const finalUrl = `${videoResource?.uri}&key=${apiKey}`;
    const response = await fetch(finalUrl);
    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), videoResource };
  } catch (error) {
    return handleApiError(error);
  }
};