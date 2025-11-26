import React, { useRef } from 'react';
import { ClosingSceneConfig } from '../types';
import { UploadIcon, SparklesIcon } from './Icons';

interface ClosingSceneEditorProps {
    config: ClosingSceneConfig;
    setConfig: (config: ClosingSceneConfig) => void;
}

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

// Static preview component to show changes in real-time
const Preview: React.FC<{ config: ClosingSceneConfig }> = ({ config }) => {
    const getTextAlignClass = (align: 'left' | 'center' | 'right') => {
        switch(align) {
            case 'left': return 'text-left';
            case 'right': return 'text-right';
            case 'center':
            default: return 'text-center';
        }
    };

    return (
        <div className="aspect-[9/16] w-40 mx-auto bg-gray-900 rounded-md overflow-hidden relative shadow-inner my-3">
            <div 
                className="absolute inset-0 flex items-center justify-center p-4" 
                style={{ backgroundColor: config.backgroundColor }}
            >
                <div className={`flex w-full ${config.textPosition === 'above' ? 'flex-col-reverse' : 'flex-col'} items-center`}>
                    {config.logoUrl ? (
                        <img 
                            src={config.logoUrl} 
                            alt="logo preview" 
                            className="object-contain my-1" 
                            style={{ width: `${config.logoSize}%` }}
                        />
                    ) : (
                        <div className="w-full h-12 bg-gray-500/30 rounded-md flex items-center justify-center text-xs text-gray-400 my-1">
                            Logo
                        </div>
                    )}
                    {config.textEnabled && (
                        <p 
                            className={`w-full font-bold text-xs break-words ${getTextAlignClass(config.textAlign)}`}
                            style={{
                                color: config.textColor,
                                fontFamily: config.fontFamily,
                                fontWeight: config.fontWeight
                            }}
                        >
                           <HighlightedTextPreview text={config.text || ' '} color={config.textColor} highlightColor={config.highlightTextColor} />
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};


const ClosingSceneEditor: React.FC<ClosingSceneEditorProps> = ({ config, setConfig }) => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const handleConfigChange = (field: keyof ClosingSceneConfig, value: any) => {
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
        // FIX: Cast to `any` to bypass incorrect TypeScript error about missing 'click' property.
        (logoInputRef.current as any)?.click();
    };

    const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
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
             <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                <label htmlFor="enable-closing-scene" className="font-medium">Habilitar Escena Final</label>
                <button
                    id="enable-closing-scene"
                    onClick={() => handleConfigChange('enabled', !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enabled ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
           
            {config.enabled && (
                 <>
                    <Preview config={config} />
                    <div className="space-y-3">
                        <div className="bg-gray-700/50 p-2 rounded-md">
                            <button onClick={handleLogoUploadClick} className="w-full bg-gray-700 p-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-600">
                                <UploadIcon className="w-4 h-4"/>
                                {config.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                            </button>
                            <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} accept="image/png, image/gif" className="hidden"/>
                        </div>
                         <div className="bg-gray-700/50 p-2 rounded-md flex items-center justify-between">
                            <label className="font-medium">Fondo</label>
                            <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                <input type="color" value={config.backgroundColor} onChange={(e) => handleConfigChange('backgroundColor', (e.currentTarget as any).value)} className="color-well"/>
                                <input type="text" value={config.backgroundColor} onChange={(e) => handleConfigChange('backgroundColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                            </div>
                        </div>
                        <div className="bg-gray-700/50 p-2 rounded-md">
                            <label htmlFor="logo-size" className="block mb-1 font-medium">Tamaño del Logo</label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="logo-size"
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={config.logoSize}
                                    // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
                                    onChange={(e) => handleConfigChange('logoSize', parseInt((e.currentTarget as any).value, 10))}
                                    className="custom-slider"
                                />
                                <span className="text-xs text-gray-400 w-8 text-right">{config.logoSize}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                            <label htmlFor="enable-closing-text" className="font-medium">Habilitar Texto</label>
                            <button
                                id="enable-closing-text"
                                onClick={() => handleConfigChange('textEnabled', !config.textEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    config.textEnabled ? 'bg-purple-600' : 'bg-gray-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        config.textEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        {config.textEnabled && (
                            <div className="space-y-3 border-t border-gray-700 pt-3">
                                <div className="relative">
                                     <textarea
                                        ref={textInputRef}
                                        value={config.text}
                                        // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
                                        onChange={(e) => handleConfigChange('text', (e.currentTarget as any).value)}
                                        placeholder="Texto de cierre..."
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
                                    <label htmlFor="closing-font-family" className="block font-medium">Tipografía</label>
                                    <select id="closing-font-family" value={config.fontFamily}
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

export default ClosingSceneEditor;