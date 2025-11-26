import React from 'react';
import { PexelsVideo } from '../types';
import { CloseIcon, LoadingIcon } from './Icons';

interface VideoSearchModalProps {
  isOpen: boolean;
  isLoading: boolean;
  videos: PexelsVideo[];
  query: string;
  onClose: () => void;
  onSelectVideo: (video: PexelsVideo) => void;
}

const VideoPreviewItem: React.FC<{ video: PexelsVideo; onSelect: () => void }> = ({ video, onSelect }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    videoRef.current?.play();
  };

  const handleMouseLeave = () => {
    videoRef.current?.pause();
  };
  
  // Find a suitable video file for preview
  const previewFile = video.video_files.find(f => f.quality === 'sd' && f.width < 1000) || video.video_files[0];

  return (
    <div 
      className="relative aspect-[9/16] bg-gray-900 rounded-md overflow-hidden cursor-pointer group"
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={previewFile?.link}
        poster={video.image}
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300 flex items-end p-2">
        <p className="text-white text-xs truncate" title={video.user.name}>by {video.user.name}</p>
      </div>
    </div>
  );
};


const VideoSearchModal: React.FC<VideoSearchModalProps> = ({ isOpen, isLoading, videos, query, onClose, onSelectVideo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 grid place-items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-purple-300">
            Resultados para: <span className="text-white font-normal">"{query}"</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-grow p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingIcon className="w-12 h-12 animate-spin text-purple-400" />
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videos.map(video => (
                <VideoPreviewItem key={video.id} video={video} onSelect={() => onSelectVideo(video)} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No se encontraron videos. Intenta con otra búsqueda.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default VideoSearchModal;