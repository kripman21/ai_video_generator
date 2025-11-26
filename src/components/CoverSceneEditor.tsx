import React, { useRef, useState, useEffect } from 'react';
import { CoverSceneConfig, StylePreset, SubtitleConfig, ClosingSceneConfig } from '../types';
import { UploadIcon, SparklesIcon, SearchIcon, LoadingIcon, TrashIcon } from './Icons';
import PresetManager from './PresetManager';
import { searchPexelsImages } from '../services/pexelsService';


interface CoverSceneEditorProps {
    config: CoverSceneConfig;
    setConfig: (config: CoverSceneConfig) => void;
    pexelsApiKey: string | null;
    subtitleConfig: SubtitleConfig;
    setSubtitleConfig: (config: SubtitleConfig) => void;
    closingSceneConfig: ClosingSceneConfig;
    setClosingSceneConfig: (config: ClosingSceneConfig) => void;
}

const fontOptions = [
    { name: "Arial", value: "Arial, Helvetica, sans-serif" },
    { name: "Arial Black", value: "'Arial Black', Gadget, sans-serif" },
    { name: "Courier New", value: "'Courier New', Courier, monospace" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Impact", value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
    { name: "Lato", value: "Lato, sans-serif" },
    { name: "Lucida Console", value: "'Lucida Console', Monaco, monospace" },
    { name: "Merriweather", value: "Merriweather, serif" },
    { name: "Montserrat", value: "Montserrat, sans-serif" },
    { name: "Poppins", value: "Poppins, sans-serif" },
    { name: "Roboto", value: "Roboto, sans-serif" },
    { name: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
    { name: "Times New Roman", value: "'Times New Roman', Times, serif" },
    { name: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
    { name: "Verdana", value: "Verdana, Geneva, Tahoma, sans-serif" },
].sort((a, b) => a.name.localeCompare(b.name));

const HighlightedTextPreview: React.FC<{ text: string; color: string; highlightColor: string }> = ({ text, color, highlightColor }) => {
    const parts = text.split(/(\*.*?\*)/g).filter(part => part);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <span key={index} style={{ color: highlightColor }}>{part.slice(1, -1)}</span>;
                }
                return <span key={index} style={{ color }}>{part}</span>;
            })}
        </>
    );
};

// Static preview component to show changes in real-time
const Preview: React.FC<{ config: CoverSceneConfig }> = ({ config }) => {
    const getTextAlignClass = (align: 'left' | 'center' | 'right') => {
        return { 'left': 'text-left', 'right': 'text-right', 'center': 'text-center' }[align] || 'text-center';
    };

    return (
        <div className="aspect-[9/16] w-40 mx-auto bg-gray-900 rounded-md overflow-hidden relative shadow-inner my-3">
            <div
                className="absolute inset-0"
                style={{ backgroundColor: config.backgroundColor }}
            >
                {config.backgroundImageUrl && (
                    <img src={config.backgroundImageUrl} alt="preview background" className="absolute inset-0 w-full h-full object-cover"/>
                )}
                {config.overlayEnabled && (
                    <div className="absolute inset-0" style={{backgroundColor: config.overlayColor, opacity: config.overlayOpacity}}></div>
                )}
                <div className={`relative z-10 w-full h-full flex items-center justify-center p-4`}>
                    <div className={`flex w-full ${config.textPosition === 'above' ? 'flex-col-reverse' : 'flex-col'} items-center`}>
                        {config.logoEnabled && config.logoUrl ? (
                            <img
                                src={config.logoUrl}
                                alt="logo preview"
                                className="object-contain my-1"
                                style={{ width: `${config.logoSize}%` }}
                            />
                        ) : config.logoEnabled ? (
                            <div className="w-full h-12 bg-gray-500/30 rounded-md flex items-center justify-center text-xs text-gray-400 my-1">
                                Logo
                            </div>
                        ): null}
                        {config.textEnabled && (
                            <p
                                className={`w-full text-xs break-words ${getTextAlignClass(config.textAlign)}`}
                                style={{ 
                                    color: config.textColor,
                                    fontFamily: config.fontFamily,
                                    fontWeight: config.fontWeight,
                                }}
                            >
                                <HighlightedTextPreview text={config.text || ' '} color={config.textColor} highlightColor={config.highlightTextColor} />
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const CoverSceneEditor: React.FC<CoverSceneEditorProps> = ({ config, setConfig, pexelsApiKey, subtitleConfig, setSubtitleConfig, closingSceneConfig, setClosingSceneConfig }) => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const [isSearchingImage, setIsSearchingImage] = useState(false);
    const [imageSearchQuery, setImageSearchQuery] = useState(config.text.replace(/\*/g, ''));

    const [presets, setPresets] = useState<StylePreset[]>([]);
    const PRESETS_STORAGE_KEY = 'ai-video-style-presets';

    useEffect(() => {
        try {
            const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
            if (savedPresets) {
                setPresets(JSON.parse(savedPresets));
            }
        } catch (error) {
            console.error("Failed to load presets from localStorage", error);
            setPresets([]);
        }
    }, []);

    const updatePresets = (newPresets: StylePreset[]) => {
        try {
            localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
            setPresets(newPresets);
        } catch (error) {
            console.error("Failed to save presets to localStorage", error);
        }
    };

    const handleConfigChange = (field: keyof CoverSceneConfig, value: any) => {
        setConfig({ ...config, [field]: value });
    };

     const handleHighlightText = () => {
        // FIX: Cast textarea to 'any' to access selection properties, resolving TS error.
        const textarea = textInputRef.current as any;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start !== end) {
                const selectedText = textarea.value.substring(start, end);
                const newText = `${textarea.value.substring(0, start)}*${selectedText}*${textarea.value.substring(end)}`;
                handleConfigChange('text', newText);
            }
        }
    };

    const handleLogoUploadClick = () => {
        (logoInputRef.current as any)?.click();
    };
    
    const handleFindImage = async () => {
        if (!pexelsApiKey) {
            (window as any).alert("La API key de Pexels no está configurada.");
            return;
        }
        setIsSearchingImage(true);
        try {
            const images = await searchPexelsImages(imageSearchQuery, pexelsApiKey);
            if (images.length > 0) {
                setConfig({ ...config, backgroundImageUrl: images[0].src.portrait });
            } else {
                (window as any).alert("No se encontraron imágenes para tu búsqueda.");
            }
        } catch (error) {
            (window as any).alert((error as Error).message);
        } finally {
            setIsSearchingImage(false);
        }
    };

    const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = (event.currentTarget as any).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleConfigChange('logoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getButtonStyle = (isActive: boolean) => {
        return isActive ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600';
    };

    return (
        <div className="space-y-3 text-sm">
            <style>{`
                input[type=range].custom-slider {
                    -webkit-appearance: none; appearance: none;
                    background: transparent; cursor: pointer; width: 100%;
                }
                input[type=range].custom-slider::-webkit-slider-runnable-track {
                    background: #4b5563; height: 0.5rem; border-radius: 0.5rem;
                }
                input[type=range].custom-slider::-moz-range-track {
                    background: #4b5563; height: 0.5rem; border-radius: 0.5rem;
                }
                input[type=range].custom-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none;
                    margin-top: -4px;
                    background-color: #a855f7; height: 1rem; width: 1rem; border-radius: 9999px;
                }
                input[type=range].custom-slider::-moz-range-thumb {
                    background-color: #a855f7; height: 1rem; width: 1rem; border-radius: 9999px; border: none;
                }
                .color-well {
                    -webkit-appearance: none; -moz-appearance: none; appearance: none;
                    min-width: 2rem; height: 2rem; padding: 0; border: none;
                    background-color: transparent; cursor: pointer; border-radius: 0.375rem;
                }
                .color-well::-webkit-color-swatch-wrapper { padding: 0; }
                .color-well::-webkit-color-swatch { border-radius: 0.375rem; border: 2px solid #4b5563; }
                .color-well::-moz-color-swatch { border-radius: 0.375rem; border: 2px solid #4b5563; }
            `}</style>

            <PresetManager
                presets={presets}
                updatePresets={updatePresets}
                currentCoverConfig={config}
                currentClosingSceneConfig={closingSceneConfig}
                currentSubtitleConfig={subtitleConfig}
                setCoverConfig={setConfig}
                setClosingConfig={setClosingSceneConfig}
                setSubtitleConfig={setSubtitleConfig}
            />
            
            <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                <label htmlFor="enable-cover-scene" className="font-medium">Habilitar Portada</label>
                <button
                    id="enable-cover-scene"
                    onClick={() => handleConfigChange('enabled', !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {config.enabled && (
                <>
                    <Preview config={config} />
                    <div className="space-y-3">
                        {/* Background Section */}
                        <div className="bg-gray-700/50 p-3 rounded-md space-y-3">
                            <h4 className="font-medium">Fondo</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={imageSearchQuery}
                                    onChange={(e) => setImageSearchQuery((e.currentTarget as any).value)}
                                    placeholder="Buscar imagen de fondo..."
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <button onClick={handleFindImage} disabled={isSearchingImage} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-md disabled:bg-gray-600">
                                    {isSearchingImage ? <LoadingIcon className="w-5 h-5 animate-spin"/> : <SearchIcon className="w-5 h-5"/>}
                                </button>
                                {config.backgroundImageUrl && (
                                    <button onClick={() => handleConfigChange('backgroundImageUrl', null)} className="p-2 bg-red-600 hover:bg-red-700 rounded-md" title="Eliminar imagen de fondo">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs">Color Sólido</label>
                                <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                    <input type="color" value={config.backgroundColor} onChange={(e) => handleConfigChange('backgroundColor', (e.currentTarget as any).value)} className="color-well"/>
                                    <input type="text" value={config.backgroundColor} onChange={(e) => handleConfigChange('backgroundColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                                </div>
                            </div>
                             {/* Overlay Section */}
                            <div className="border-t border-gray-700 pt-3 mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="enable-cover-overlay" className="font-medium text-xs">Superposición de Color</label>
                                    <button
                                        id="enable-cover-overlay"
                                        onClick={() => handleConfigChange('overlayEnabled', !config.overlayEnabled)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.overlayEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}>
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config.overlayEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {config.overlayEnabled && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs">Color</label>
                                            <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                                <input type="color" value={config.overlayColor} onChange={(e) => handleConfigChange('overlayColor', (e.currentTarget as any).value)} className="color-well"/>
                                                <input type="text" value={config.overlayColor} onChange={(e) => handleConfigChange('overlayColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-xs">Opacidad</label>
                                            <div className="flex items-center gap-2">
                                            <input type="range" min="0" max="1" step="0.05" value={config.overlayOpacity}
                                                onChange={(e) => handleConfigChange('overlayOpacity', parseFloat((e.currentTarget as any).value))}
                                                className="custom-slider" />
                                                <span className="text-xs text-gray-400 w-10 text-right">{Math.round(config.overlayOpacity*100)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <label htmlFor="enable-cover-logo" className="font-medium">Habilitar Logo</label>
                            <button
                                id="enable-cover-logo"
                                onClick={() => handleConfigChange('logoEnabled', !config.logoEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.logoEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.logoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {config.logoEnabled && (
                            <div className="space-y-3 border-t border-gray-700 pt-3">
                                <button onClick={handleLogoUploadClick} className="w-full bg-gray-700 p-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-600">
                                    <UploadIcon className="w-4 h-4" />
                                    {config.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                                </button>
                                <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} accept="image/png, image/gif" className="hidden" />
                                <div className="bg-gray-700/50 p-2 rounded-md">
                                    <label htmlFor="logo-size" className="block mb-1 font-medium">Tamaño del Logo</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="logo-size"
                                            type="range"
                                            min="10"
                                            max="100"
                                            value={config.logoSize}
                                            onChange={(e) => handleConfigChange('logoSize', parseInt((e.currentTarget as any).value, 10))}
                                            className="custom-slider"
                                        />
                                        <span className="text-xs text-gray-400 w-8 text-right">{config.logoSize}%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <label htmlFor="enable-cover-text" className="font-medium">Habilitar Texto</label>
                            <button
                                id="enable-cover-text"
                                onClick={() => handleConfigChange('textEnabled', !config.textEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.textEnabled ? 'bg-purple-600' : 'bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.textEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {config.textEnabled && (
                            <div className="space-y-3 border-t border-gray-700 pt-3">
                                 <p className="text-xs text-gray-400 -mt-2 mb-2">Envuelve una palabra en *asteriscos* para resaltarla.</p>
                                <div className="relative">
                                    <textarea
                                        ref={textInputRef}
                                        value={config.text}
                                        onChange={(e) => handleConfigChange('text', (e.currentTarget as any).value)}
                                        placeholder="Texto de portada..."
                                        rows={2}
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-md p-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <button
                                      onClick={handleHighlightText}
                                      className="absolute top-1 right-1 text-gray-400 hover:text-purple-400 p-1 z-10"
                                      aria-label="Resaltar texto seleccionado"
                                      title="Resaltar texto seleccionado"
                                    >
                                      <SparklesIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                 <div className="space-y-2">
                                    <label htmlFor="cover-font-family" className="block font-medium">Tipografía</label>
                                    <select id="cover-font-family" value={config.fontFamily}
                                        onChange={(e) => handleConfigChange('fontFamily', (e.currentTarget as any).value)}
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                                        {fontOptions.map(font => (
                                            <option key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.name}</option>
                                        ))}
                                    </select>
                                </div>
                                 <div className="space-y-2">
                                    <label className="block font-medium">Grosor de la Fuente</label>
                                    <div className="flex rounded-md shadow-sm w-full" role="group">
                                        <button type="button" onClick={() => handleConfigChange('fontWeight', 'lighter')} className={`w-full px-3 py-1 text-xs font-medium rounded-l-lg ${getButtonStyle(config.fontWeight === 'lighter')}`}>Light</button>
                                        <button type="button" onClick={() => handleConfigChange('fontWeight', 'normal')} className={`w-full px-3 py-1 text-xs font-medium ${getButtonStyle(config.fontWeight === 'normal')}`}>Regular</button>
                                        <button type="button" onClick={() => handleConfigChange('fontWeight', 'bold')} className={`w-full px-3 py-1 text-xs font-medium rounded-r-lg ${getButtonStyle(config.fontWeight === 'bold')}`}>Bold</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-700/50 p-2 rounded-md flex items-center justify-between">
                                        <label>Color del Texto</label>
                                        <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                            <input type="color" value={config.textColor} onChange={(e) => handleConfigChange('textColor', (e.currentTarget as any).value)} className="color-well"/>
                                            <input type="text" value={config.textColor} onChange={(e) => handleConfigChange('textColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                                        </div>
                                    </div>
                                    <div className="bg-gray-700/50 p-2 rounded-md flex items-center justify-between">
                                        <label>Resaltado</label>
                                        <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                            <input type="color" value={config.highlightTextColor} onChange={(e) => handleConfigChange('highlightTextColor', (e.currentTarget as any).value)} className="color-well"/>
                                            <input type="text" value={config.highlightTextColor} onChange={(e) => handleConfigChange('highlightTextColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex rounded-md shadow-sm" role="group">
                                            <button type="button" onClick={() => handleConfigChange('textPosition', 'above')} className={`px-3 py-1 text-xs font-medium rounded-l-lg ${getButtonStyle(config.textPosition === 'above')}`}>Arriba</button>
                                            <button type="button" onClick={() => handleConfigChange('textPosition', 'below')} className={`px-3 py-1 text-xs font-medium rounded-r-lg ${getButtonStyle(config.textPosition === 'below')}`}>Abajo</button>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex rounded-md shadow-sm w-full" role="group">
                                            <button type="button" onClick={() => handleConfigChange('textAlign', 'left')} className={`w-full px-3 py-1 text-xs font-medium rounded-l-lg ${getButtonStyle(config.textAlign === 'left')}`}>Izquierda</button>
                                            <button type="button" onClick={() => handleConfigChange('textAlign', 'center')} className={`w-full px-3 py-1 text-xs font-medium ${getButtonStyle(config.textAlign === 'center')}`}>Centro</button>
                                            <button type="button" onClick={() => handleConfigChange('textAlign', 'right')} className={`w-full px-3 py-1 text-xs font-medium rounded-r-lg ${getButtonStyle(config.textAlign === 'right')}`}>Derecha</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CoverSceneEditor;