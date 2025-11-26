import React from 'react';
import { EditIcon } from './Icons';

interface ScriptInputProps {
  script: string;
  setScript: (script: string) => void;
  onGenerateVideo: () => void;
  onGenerateSample: () => void;
  isDisabled: boolean;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onGenerateVideo, onGenerateSample, isDisabled }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col h-[75vh]">
      <h2 className="text-xl font-semibold mb-4 text-purple-300 flex items-center border-b border-gray-700 pb-2">
        <EditIcon className="w-5 h-5 mr-3"/>
        Guion del Video
      </h2>
      <textarea
        value={script}
        // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
        onChange={(e) => setScript((e.currentTarget as any).value)}
        placeholder="Escribe aquí el guion de tu video... Por ejemplo: 'El futuro de la tecnología ya está aquí. La IA está cambiando el mundo, haciendo nuestras vidas más fáciles y conectadas que nunca.'"
        className="flex-grow w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
        disabled={isDisabled}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={onGenerateSample}
          disabled={isDisabled}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isDisabled ? 'Generando...' : 'Generar Muestra'}
        </button>
        <button
          onClick={onGenerateVideo}
          disabled={isDisabled}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isDisabled ? 'Generando...' : 'Generar Video'}
        </button>
      </div>
    </div>
  );
};

export default ScriptInput;