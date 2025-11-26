import React, { ChangeEvent, useState, useRef } from 'react';
import { Scene, PexelsVideo } from '../types';
import { PlayIcon, SearchIcon, LoadingIcon, TrashIcon } from './Icons';
import { searchPexelsVideos } from '../services/pexelsService';
import VideoSearchModal from './VideoSearchModal';

interface SceneCardProps {
  scene: Scene;
  updateScene: (scene: Scene) => void;
  pexelsApiKey: string | null;
  onDelete: (id: string) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, updateScene, pexelsApiKey, onDelete }) => {
  const [videoSearchQuery, setVideoSearchQuery] = useState(scene.description);
  const [isSearching, setIsSearching] = useState(false);
  const scriptTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<PexelsVideo[]>([]);


  const handleFindVideo = async () => {
    if (!pexelsApiKey) {
      // FIX: Cast `window` to `any` to access `alert` function, resolving TypeScript error.
      (window as any).alert("La API key de Pexels no está configurada.");
      return;
    }
    setIsSearching(true);
    setIsModalOpen(true);
    setSearchResults([]); // Clear previous results
    try {
      const videos = await searchPexelsVideos(videoSearchQuery, pexelsApiKey);
      setSearchResults(videos);
    } catch (error) {
      // FIX: Cast `window` to `any` to access `alert` function, resolving TypeScript error.
      (window as any).alert((error as Error).message);
      setIsModalOpen(false); // Close modal on error
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVideo = (video: PexelsVideo) => {
    updateScene({ ...scene, video });
    setIsModalOpen(false);
  };

  const handleScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
    updateScene({ ...scene, script: (e.currentTarget as any).value });
    // Note: In a real app, you'd want to debounce this and offer a "regenerate audio" button
  }
  
  const handleDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
    setVideoSearchQuery((e.currentTarget as any).value);
    updateScene({ ...scene, description: (e.currentTarget as any).value });
  };


  return (
    <>
       <VideoSearchModal 
        isOpen={isModalOpen}
        isLoading={isSearching}
        videos={searchResults}
        query={videoSearchQuery}
        onClose={() => setIsModalOpen(false)}
        onSelectVideo={handleSelectVideo}
      />
      <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col md:flex-row gap-4 relative">
        <button 
          onClick={() => onDelete(scene.id)} 
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 p-1 bg-gray-800/50 rounded-full z-20"
          aria-label="Delete scene"
        >
          <TrashIcon className="w-4 h-4" />
        </button>

        <div className="w-full md:w-32 flex-shrink-0">
          <p className="text-purple-300 font-bold mb-2">Escena {scene.scene_number}</p>
          <div className="aspect-[9/16] bg-gray-900 rounded-md overflow-hidden relative">
            {scene.video ? (
              <img src={scene.video.image} alt="Scene thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Sin Video</div>
            )}
            {scene.audioUrl && (
              // FIX: Cast `window` to `any` to access `Audio` constructor, resolving TypeScript error.
              <button onClick={() => new (window as any).Audio(scene.audioUrl!).play()} className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-75">
                <PlayIcon className="w-4 h-4"/>
              </button>
            )}
          </div>
        </div>
        <div className="flex-grow">
          <div className="mb-2 relative">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400">Guion (Subtítulos y Locución)</label>
            </div>
            <textarea
              ref={scriptTextAreaRef}
              value={scene.script}
              onChange={handleScriptChange}
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Descripción para Búsqueda de Video</label>
            <div className="flex gap-2">
                <input
                  type="text"
                  value={videoSearchQuery}
                  onChange={handleDescriptionChange}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button onClick={handleFindVideo} disabled={isSearching && isModalOpen} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-md disabled:bg-gray-600">
                  {isSearching && isModalOpen ? <LoadingIcon className="w-5 h-5 animate-spin"/> : <SearchIcon className="w-5 h-5"/>}
                </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SceneCard;