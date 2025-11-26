import React, { useRef } from 'react';
import { BackgroundMusic, BackgroundMusicOption } from '../types';
import { TrashIcon, UploadIcon } from './Icons';
import { copyrightFreeMusic } from '../data/media';

interface MusicSelectorProps {
  music: BackgroundMusic | null;
  setMusic: (music: BackgroundMusic | null) => void;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({ music, setMusic }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSelectFromLibrary = (track: BackgroundMusicOption) => {
    setMusic({ ...track, volume: music?.volume ?? 0.2 });
  };
  
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (music) {
      // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
      setMusic({ ...music, volume: parseFloat((event.currentTarget as any).value) });
    }
  };

  const handleRemoveMusic = () => {
    setMusic(null);
  };
  
  const handleFileUploadClick = () => {
    // FIX: Cast to `any` to bypass incorrect TypeScript error about missing 'click' property.
    (fileInputRef.current as any)?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
    const file = (event.currentTarget as any).files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setMusic({
        url: fileUrl,
        name: file.name,
        volume: music?.volume ?? 0.2,
      });
    }
    // Reset file input to allow uploading the same file again
    if(event.currentTarget) {
      // FIX: Cast currentTarget to 'any' to resolve incorrect TypeScript error.
      (event.currentTarget as any).value = '';
    }
  };

  return (
    <div className="space-y-3">
      {music && (
        <div className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex-grow overflow-hidden mr-4">
            <p className="text-sm font-medium text-white truncate" title={music.name}>{music.name}</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={music.volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
              title={`Volumen: ${Math.round(music.volume * 100)}%`}
            />
          </div>
          <button onClick={handleRemoveMusic} className="text-gray-400 hover:text-red-400 p-2 flex-shrink-0">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="h-[90px] overflow-y-auto pr-1 space-y-2">
          {copyrightFreeMusic.map((track) => (
              <button
                  key={track.url}
                  onClick={() => handleSelectFromLibrary(track)}
                  className={`w-full text-left text-sm p-2 rounded-md transition-colors truncate ${
                      music?.url === track.url && !music.name.startsWith('blob:') ? 'bg-purple-600 font-semibold' : 'bg-gray-700/50 hover:bg-gray-700'
                  }`}
                  title={track.name}
              >
                  {track.name}
              </button>
          ))}
      </div>
      
      <div>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
        />
        <button 
            onClick={handleFileUploadClick}
            className="w-full flex items-center justify-center gap-2 text-sm p-2 rounded-md transition-colors bg-gray-700/50 hover:bg-gray-700"
        >
            <UploadIcon className="w-4 h-4"/>
            Subir Archivo
        </button>
      </div>

    </div>
  );
};

export default MusicSelector;