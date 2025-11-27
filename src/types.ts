// FIX: Define the PexelsVideoFile interface and remove the incorrect self-import.
export interface PexelsVideoFile {
  id: number;
  quality?: string | null;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  image: string; // This is the thumbnail URL
  duration: number;
  video_files: PexelsVideoFile[];
  url: string; // page url
  user: {
    id: number;
    name: string;
    url: string;
  };
}

export interface PexelsImageSrc {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsImage {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsImageSrc;
  alt: string;
}


export interface Scene {
  id: string;
  scene_number: number;
  description: string;
  script: string;
  video: PexelsVideo | null;
  audioUrl: string | null;
  duration: number; // Duration of the scene in milliseconds
}

export interface BackgroundMusic {
  url: string;
  name: string;
  volume: number;
}

export interface BackgroundMusicOption {
  url: string;
  name: string;
}

export interface CoverSceneConfig {
  enabled: boolean;
  logoUrl: string | null;
  logoEnabled: boolean;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  logoSize: number;
  textEnabled: boolean;
  text: string;
  textColor: string;
  highlightTextColor: string;
  textPosition: 'above' | 'below';
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'lighter';
}

export interface ClosingSceneConfig {
  enabled: boolean;
  logoUrl: string | null;
  backgroundColor: string;
  logoSize: number;
  textEnabled: boolean;
  text: string;
  textColor: string;
  highlightTextColor: string;
  textPosition: 'above' | 'below';
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'lighter';
}

export interface ShadowConfig {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface SubtitleConfig {
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  fontSize: number;
  textColor: string;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'lighter';
  shadowConfig: ShadowConfig;
  highlightTextColor: string;
}

export interface StylePreset {
  name: string;
  coverSceneConfig: CoverSceneConfig;
  closingSceneConfig: ClosingSceneConfig;
  subtitleConfig: SubtitleConfig;
}