import React, { useState } from 'react';
import { CloseIcon, KeyIcon } from './Icons';

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave, currentKey }) => {
  const [apiKey, setApiKey] = useState(currentKey || '');

  const handleSave = () => {
    onSave(apiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-purple-300 flex items-center">
            <KeyIcon className="w-6 h-6 mr-3" />
            API Key de Pexels
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-400 mb-4 text-sm">
          Para buscar videos de stock automáticamente, necesitas una API key gratuita de Pexels.
        </p>
        <input
          type="text"
          value={apiKey}
          // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
          onChange={(e) => setApiKey((e.currentTarget as any).value)}
          placeholder="Ingresa tu API key de Pexels"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          ¿No tienes una? Obtén una gratis en el{' '}
          <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            sitio web de la API de Pexels
          </a>.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Guardar Clave
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;