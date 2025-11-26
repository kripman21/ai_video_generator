import React from 'react';
import { SubtitleConfig, ShadowConfig } from '../types';

interface SubtitleEditorProps {
    config: SubtitleConfig;
    setConfig: (config: SubtitleConfig) => void;
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
];

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({ config, setConfig }) => {
    const handleConfigChange = (field: keyof SubtitleConfig, value: any) => {
        setConfig({ ...config, [field]: value });
    };

    const handleShadowConfigChange = (field: keyof ShadowConfig, value: any) => {
        setConfig({
            ...config,
            shadowConfig: {
                ...config.shadowConfig,
                [field]: value
            }
        });
    };

    const getButtonStyle = (isActive: boolean) => {
        return isActive ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600';
    };

    return (
        <div className="space-y-4 text-sm">
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
            
            <div>
                <label className="block mb-2 font-medium">Alineación Horizontal</label>
                <div className="flex rounded-md shadow-sm w-full" role="group">
                    <button type="button" onClick={() => handleConfigChange('textAlign', 'left')} className={`w-full px-3 py-2 text-xs font-medium rounded-l-lg ${getButtonStyle(config.textAlign === 'left')}`}>Izquierda</button>
                    <button type="button" onClick={() => handleConfigChange('textAlign', 'center')} className={`w-full px-3 py-2 text-xs font-medium ${getButtonStyle(config.textAlign === 'center')}`}>Centro</button>
                    <button type="button" onClick={() => handleConfigChange('textAlign', 'right')} className={`w-full px-3 py-2 text-xs font-medium rounded-r-lg ${getButtonStyle(config.textAlign === 'right')}`}>Derecha</button>
                </div>
            </div>

            <div>
                <label className="block mb-2 font-medium">Alineación Vertical</label>
                <div className="flex rounded-md shadow-sm w-full" role="group">
                    <button type="button" onClick={() => handleConfigChange('verticalAlign', 'top')} className={`w-full px-3 py-2 text-xs font-medium rounded-l-lg ${getButtonStyle(config.verticalAlign === 'top')}`}>Arriba</button>
                    <button type="button" onClick={() => handleConfigChange('verticalAlign', 'middle')} className={`w-full px-3 py-2 text-xs font-medium ${getButtonStyle(config.verticalAlign === 'middle')}`}>Centro</button>
                    <button type="button" onClick={() => handleConfigChange('verticalAlign', 'bottom')} className={`w-full px-3 py-2 text-xs font-medium rounded-r-lg ${getButtonStyle(config.verticalAlign === 'bottom')}`}>Abajo</button>
                </div>
            </div>

            <div className="bg-gray-700/50 p-3 rounded-md">
                <label htmlFor="font-size" className="block mb-2 font-medium">Tamaño del Texto</label>
                <div className="flex items-center gap-3">
                    <input id="font-size" type="range" min="12" max="200" value={config.fontSize}
                        onChange={(e) => handleConfigChange('fontSize', parseInt((e.currentTarget as any).value, 10))}
                        className="custom-slider" />
                    <span className="text-sm text-gray-300 w-16 text-center bg-gray-800 p-1 rounded">{config.fontSize}px</span>
                </div>
            </div>
             <div>
                <label className="block mb-2 font-medium">Grosor de la Fuente</label>
                <div className="flex rounded-md shadow-sm w-full" role="group">
                    <button type="button" onClick={() => handleConfigChange('fontWeight', 'lighter')} className={`w-full px-3 py-2 text-xs font-medium rounded-l-lg ${getButtonStyle(config.fontWeight === 'lighter')}`}>Light</button>
                    <button type="button" onClick={() => handleConfigChange('fontWeight', 'normal')} className={`w-full px-3 py-2 text-xs font-medium ${getButtonStyle(config.fontWeight === 'normal')}`}>Regular</button>
                    <button type="button" onClick={() => handleConfigChange('fontWeight', 'bold')} className={`w-full px-3 py-2 text-xs font-medium rounded-r-lg ${getButtonStyle(config.fontWeight === 'bold')}`}>Bold</button>
                </div>
            </div>

            <div>
                <label htmlFor="font-family" className="block mb-2 font-medium">Tipografía</label>
                <select id="font-family" value={config.fontFamily}
                    onChange={(e) => handleConfigChange('fontFamily', (e.currentTarget as any).value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                    {fontOptions.map(font => (
                        <option key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                    <label className="font-medium">Color</label>
                    <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                        <input type="color" value={config.textColor} onChange={(e) => handleConfigChange('textColor', (e.currentTarget as any).value)} className="color-well"/>
                        <input type="text" value={config.textColor} onChange={(e) => handleConfigChange('textColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                    </div>
                </div>
                 <div className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                    <label className="font-medium">Resaltado</label>
                    <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                        <input type="color" value={config.highlightTextColor} onChange={(e) => handleConfigChange('highlightTextColor', (e.currentTarget as any).value)} className="color-well"/>
                        <input type="text" value={config.highlightTextColor} onChange={(e) => handleConfigChange('highlightTextColor', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                    </div>
                </div>
            </div>

            <div className="space-y-3 border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="enable-text-shadow" className="font-medium">Sombra de Texto</label>
                    <button id="enable-text-shadow" onClick={() => handleShadowConfigChange('enabled', !config.shadowConfig.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.shadowConfig.enabled ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.shadowConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                {config.shadowConfig.enabled && (
                    <div className="space-y-3 bg-gray-700/50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                            <label className="font-medium text-xs">Color de Sombra</label>
                            <div className="flex items-center gap-2 bg-gray-800 rounded-md border border-gray-600 px-2">
                                <input type="color" value={config.shadowConfig.color} onChange={(e) => handleShadowConfigChange('color', (e.currentTarget as any).value)} className="color-well"/>
                                <input type="text" value={config.shadowConfig.color} onChange={(e) => handleShadowConfigChange('color', (e.currentTarget as any).value)} className="w-20 bg-transparent text-sm p-1 focus:outline-none"/>
                            </div>
                        </div>
                         <div>
                            <label className="block mb-1 text-xs font-medium">Offset X ({config.shadowConfig.offsetX}px)</label>
                            <input type="range" min="-10" max="10" value={config.shadowConfig.offsetX}
                                onChange={(e) => handleShadowConfigChange('offsetX', parseInt((e.currentTarget as any).value, 10))}
                                className="custom-slider" />
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-medium">Offset Y ({config.shadowConfig.offsetY}px)</label>
                            <input type="range" min="-10" max="10" value={config.shadowConfig.offsetY}
                                onChange={(e) => handleShadowConfigChange('offsetY', parseInt((e.currentTarget as any).value, 10))}
                                className="custom-slider" />
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-medium">Blur ({config.shadowConfig.blur}px)</label>
                            <input type="range" min="0" max="20" value={config.shadowConfig.blur}
                                onChange={(e) => handleShadowConfigChange('blur', parseInt((e.currentTarget as any).value, 10))}
                                className="custom-slider" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubtitleEditor;