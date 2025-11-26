import React, { useState, useRef, useEffect } from 'react';
import { CoverSceneConfig, StylePreset, ClosingSceneConfig, SubtitleConfig } from '../types';
import { BookmarkSquareIcon, ChevronDownIcon, TrashIcon } from './Icons';

interface PresetManagerProps {
    presets: StylePreset[];
    updatePresets: (presets: StylePreset[]) => void;
    currentCoverConfig: CoverSceneConfig;
    currentClosingSceneConfig: ClosingSceneConfig;
    currentSubtitleConfig: SubtitleConfig;
    setCoverConfig: (config: CoverSceneConfig) => void;
    setClosingConfig: (config: ClosingSceneConfig) => void;
    setSubtitleConfig: (config: SubtitleConfig) => void;
}

const PresetManager: React.FC<PresetManagerProps> = ({ presets, updatePresets, currentCoverConfig, currentClosingSceneConfig, currentSubtitleConfig, setCoverConfig, setClosingConfig, setSubtitleConfig }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const panelRef = useRef<HTMLDivElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSavePreset = () => {
        if (!newPresetName.trim()) {
            if (!newPresetName.trim()) {
                alert("Por favor, ingresa un nombre para el preset.");
                return;
            }
        }
        if (presets.some(p => p.name === newPresetName.trim())) {
            if (presets.some(p => p.name === newPresetName.trim())) {
                if (!confirm(`Ya existe un preset con el nombre "${newPresetName.trim()}". ¿Deseas sobrescribirlo?`)) {
                    return;
                }
            }
        }

        const updatedPresets = presets.filter(p => p.name !== newPresetName.trim());
        const newPreset: StylePreset = {
            name: newPresetName.trim(),
            coverSceneConfig: currentCoverConfig,
            closingSceneConfig: currentClosingSceneConfig,
            subtitleConfig: currentSubtitleConfig,
        };
        updatePresets([...updatedPresets, newPreset].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPresetName('');
        setIsPanelOpen(false);
    };

    const handleLoadPreset = (preset: StylePreset) => {
        setCoverConfig(preset.coverSceneConfig);
        setClosingConfig(preset.closingSceneConfig);
        setSubtitleConfig(preset.subtitleConfig);
        setIsPanelOpen(false);
    };

    const handleDeletePreset = (presetName: string) => {
        if (confirm(`¿Estás seguro de que quieres eliminar el preset "${presetName}"?`)) {
            const newPresets = presets.filter(p => p.name !== presetName);
            updatePresets(newPresets);
        }
    };

    const handleExportPresets = () => {
        if (presets.length === 0) {
            alert("No hay presets para exportar.");
            return;
        }
        try {
            const jsonString = JSON.stringify(presets, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ai-video-style-presets.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting presets:", error);
            alert("Ocurrió un error al exportar los presets.");
        }
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("El contenido del archivo no es texto.");

                const importedPresets = JSON.parse(text);

                if (!Array.isArray(importedPresets)) {
                    throw new Error("El archivo importado no es una lista válida de presets.");
                }

                if (importedPresets.length > 0) {
                    const firstPreset = importedPresets[0];
                    if (!('name' in firstPreset && 'coverSceneConfig' in firstPreset && 'closingSceneConfig' in firstPreset && 'subtitleConfig' in firstPreset)) {
                        throw new Error("La estructura del preset importado es incorrecta.");
                    }
                }

                const updatedPresetsMap = new Map<string, StylePreset>();
                presets.forEach(p => updatedPresetsMap.set(p.name, p));
                importedPresets.forEach((p: StylePreset) => updatedPresetsMap.set(p.name, p));

                const mergedPresets = Array.from(updatedPresetsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

                updatePresets(mergedPresets);
                alert(`${importedPresets.length} presets importados exitosamente.`);
            } catch (error) {
                console.error("Error importing presets:", error);
                alert(`Error al importar presets: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="relative mb-4" ref={panelRef}>
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="w-full flex items-center justify-between bg-gray-700/50 p-2 rounded-md hover:bg-gray-700 transition-colors"
            >
                <span className="font-medium flex items-center gap-2">
                    <BookmarkSquareIcon className="w-5 h-5" />
                    Presets
                </span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPanelOpen && (
                <div className="absolute z-10 top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3 space-y-3">
                    {presets.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-400">Presets Guardados</h4>
                            <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                                {presets.map(preset => (
                                    <div key={preset.name} className="flex items-center justify-between group bg-gray-700/50 p-2 rounded-md">
                                        <button onClick={() => handleLoadPreset(preset)} className="text-left flex-grow hover:text-purple-300 transition-colors truncate pr-2" title={preset.name}>
                                            {preset.name}
                                        </button>
                                        <button onClick={() => handleDeletePreset(preset.name)} className="text-gray-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-1">Guardar Estilo Actual</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.currentTarget.value)}
                                placeholder="Nombre del preset..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleSavePreset}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold p-2 rounded-md transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Administrar Presets</h4>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={importInputRef}
                                onChange={handleImportFileChange}
                                accept=".json,application/json"
                                className="hidden"
                            />
                            <button
                                onClick={handleImportClick}
                                className="w-full text-center bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold p-2 rounded-md transition-colors"
                            >
                                Importar
                            </button>
                            <button
                                onClick={handleExportPresets}
                                className="w-full text-center bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold p-2 rounded-md transition-colors"
                            >
                                Exportar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresetManager;