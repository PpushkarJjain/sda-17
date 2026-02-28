export type FashionCategory = 'saree' | 'kurti' | 'jewelry' | 'lehenga';

export interface SareeImage {
  file: File;
  previewUrl: string;
}

export interface SareeImageSet {
  fullSaree: SareeImage | null;
  border: SareeImage | null;
  pallu: SareeImage | null;
  skirt: SareeImage | null;
  blouse: SareeImage | null;
  embroidery: SareeImage | null;
}

export interface KurtiImageSet {
  frontView: SareeImage | null;
  bottoms: SareeImage | null;
  fabricDetail: SareeImage | null;
  dupatta: SareeImage | null;
  secondaryFabricDetail: SareeImage | null;
}

export interface JewelryImageSet {
  productShot: SareeImage | null;
  mannequinShot: SareeImage | null;
  sideView: SareeImage | null;
  topView: SareeImage | null;
  backView: SareeImage | null;
}

export interface LehengaImageSet {
  fullSet: SareeImage | null;
  lehengaCloseUp: SareeImage | null;
  choliCloseUp: SareeImage | null;
  dupattaCloseUp: SareeImage | null;
  belt: SareeImage | null;
}

export type SareeImageType = keyof SareeImageSet;
export type LehengaImageType = keyof LehengaImageSet;

// Structure to hold image data and its edit history
export interface GeneratedImageItem {
  current: string;
  history: string[];
}

// Preset Interface
export interface SavedPreset {
  id: string;
  name: string;
  timestamp: number;
  referenceData?: string; // Encoded base64 string for reference image
  referenceMimeType?: string;
  config: {
    selectedPoses: string[];
    customPose: string;
    background: string;
    customBackground: string;
    visualStyle: string;
    // Saree
    palluStyle?: string;
    palluMeasurement?: string;
    designType?: string;
    hasStoneWork?: boolean;
    stoneWorkLocation?: string;
    jewelleryLevel?: 'None' | 'Sober' | 'Medium' | 'Heavy';
    hasBindi?: boolean;
    // Kurti
    kurtiSubCategory?: 'kurti' | 'suit';
    // Jewelry
    // Lehenga
    skirtVolume?: string;
    drapingStyle?: string;
    blouseCut?: string;
    
    resolution: string;
    aspectRatio: string;
    additionalDetails: string;
    enableEnhancedAnalysis: boolean;
    enableEnhancedRealism?: boolean; 
    fidelityMode?: 'accurate' | 'marketing';
    modelDescription?: string;
    lockRefIdentity?: boolean;
    activeCategory?: FashionCategory;
  };
}