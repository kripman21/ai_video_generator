import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Scene, BackgroundMusic, PexelsVideo, ClosingSceneConfig, SubtitleConfig, CoverSceneConfig } from '../types';
import { PlayIcon, PauseIcon, ReplayIcon, ToStartIcon, ToEndIcon, NextIcon, PreviousIcon, DownloadIcon, LoadingIcon } from './Icons';

interface VideoPreviewProps {
  scenes: Scene[];
  backgroundMusic: BackgroundMusic | null;
  coverSceneConfig: CoverSceneConfig;
  closingSceneConfig: ClosingSceneConfig;
  subtitleConfig: SubtitleConfig;
  isRendering: boolean;
  renderProgress: number;
  renderMessage: string;
  onDownload: () => void;
}

const COVER_SCENE_DURATION = 100; // ms, a quick flash frame
const CLOSING_SCENE_DURATION = 3000; // ms
const RENDER_WIDTH = 720; // The fixed width of the final render canvas

const findBestVideoUrl = (video: PexelsVideo | null): string => {
    if (!video?.video_files) return '';
    const portraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width && f.height >= 1920);
    if (portraitHd) return portraitHd.link;
    const anyPortraitHd = video.video_files.find(f => f.quality === 'hd' && f.height > f.width);
    if (anyPortraitHd) return anyPortraitHd.link;
    const anyPortrait = video.video_files.find(f => f.height > f.width);
    if (anyPortrait) return anyPortrait.link;
    return video.video_files[0]?.link || '';
};

const formatTime = (timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VideoPreview: React.FC<VideoPreviewProps> = ({ scenes, backgroundMusic, coverSceneConfig, closingSceneConfig, subtitleConfig, isRendering, renderProgress, renderMessage, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0); // 0 for A, 1 for B
  
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number | null>(null);
  const timeAtStartRef = useRef<number>(0);
  const seekTimeoutRef = useRef<number | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scaledFontSize, setScaledFontSize] = useState(subtitleConfig.fontSize);

  useLayoutEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    // FIX: Cast 'window' to 'any' to access 'ResizeObserver', resolving TypeScript error when 'dom' lib is not included.
    const observer = new (window as any).ResizeObserver((entries: any[]) => {
      const entry = entries[0];
      if (entry) {
        const previewWidth = entry.contentRect.width;
        const scaleFactor = previewWidth / RENDER_WIDTH;
        setScaledFontSize(subtitleConfig.fontSize * scaleFactor);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [subtitleConfig.fontSize]);

  const { sceneTimings, totalDuration } = useMemo(() => {
    let accumulatedTime = 0;
    if (coverSceneConfig.enabled) {
      accumulatedTime += COVER_SCENE_DURATION;
    }
    const timings = scenes.map(scene => {
      const startTime = accumulatedTime;
      const duration = scene.duration;
      accumulatedTime += duration;
      return { id: scene.id, startTime, duration, endTime: startTime + duration };
    });
    const finalDuration = closingSceneConfig.enabled ? accumulatedTime + CLOSING_SCENE_DURATION : accumulatedTime;
    return { sceneTimings: timings, totalDuration: finalDuration };
  }, [scenes, coverSceneConfig.enabled, closingSceneConfig.enabled]);

  const { sceneIndex, timeInScene, isCoverScene, isClosingScene } = useMemo(() => {
    if (coverSceneConfig.enabled && currentTime < COVER_SCENE_DURATION) {
      return { sceneIndex: -1, timeInScene: currentTime, isCoverScene: true, isClosingScene: false };
    }
    const closingSceneStartTime = totalDuration - CLOSING_SCENE_DURATION;
    if (closingSceneConfig.enabled && currentTime >= closingSceneStartTime && totalDuration > CLOSING_SCENE_DURATION) {
      return { sceneIndex: scenes.length, timeInScene: currentTime - closingSceneStartTime, isCoverScene: false, isClosingScene: true };
    }
    const timingIndex = sceneTimings.findIndex(t => currentTime >= t.startTime && currentTime < t.endTime);
    if (timingIndex > -1) {
      const sceneStartTime = sceneTimings[timingIndex].startTime;
      return {
        sceneIndex: timingIndex,
        timeInScene: currentTime - sceneStartTime,
        isCoverScene: false,
        isClosingScene: false,
      };
    }
    const isEnd = currentTime >= totalDuration;
    return {
      sceneIndex: isEnd ? scenes.length : -1,
      timeInScene: 0,
      isCoverScene: false,
      isClosingScene: isEnd && closingSceneConfig.enabled,
    };
  }, [currentTime, totalDuration, sceneTimings, scenes.length, coverSceneConfig.enabled, closingSceneConfig.enabled]);

  const progress = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0;
  const currentScene = scenes[sceneIndex];

  // Background music management
  useEffect(() => {
    const bgAudioEl = bgAudioRef.current;
    if (!bgAudioEl || isRendering) return;

    if (backgroundMusic) {
      // FIX: Cast to `any` to bypass incorrect TypeScript errors about missing properties.
      if ((bgAudioEl as any).src !== backgroundMusic.url) {
        (bgAudioEl as any).pause();
        (bgAudioEl as any).src = backgroundMusic.url;
      }
      (bgAudioEl as any).volume = backgroundMusic.volume;

      if (isPlaying) {
        // FIX: Cast to `any` to bypass incorrect TypeScript errors about missing properties.
        (bgAudioEl as any).play().catch((e: any) => e.name !== 'AbortError' && console.error("BG Music Play Error:", e));
      } else {
        // FIX: Cast to `any` to bypass incorrect TypeScript errors about missing properties.
        (bgAudioEl as any).pause();
      }
    } else {
      // FIX: Cast to `any` to bypass incorrect TypeScript errors about missing properties.
      (bgAudioEl as any).pause();
      (bgAudioEl as any).src = '';
    }
  }, [backgroundMusic, isPlaying, isRendering]);
  
  // Core playback loop using requestAnimationFrame
  useEffect(() => {
    const loop = (time: number) => {
      if (playbackStartTimeRef.current === null) {
        playbackStartTimeRef.current = time;
        timeAtStartRef.current = currentTime;
      }

      const elapsed = time - playbackStartTimeRef.current;
      const newTime = timeAtStartRef.current + elapsed;

      if (newTime >= totalDuration) {
          setCurrentTime(totalDuration);
          setIsPlaying(false);
          setIsFinished(true);
          return; 
      }
      
      setCurrentTime(newTime);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying && !isRendering) {
      playbackStartTimeRef.current = performance.now();
      timeAtStartRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      playbackStartTimeRef.current = null;
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) };
  }, [isPlaying, totalDuration, isRendering]);

  // Effect for narration audio seeking. Runs frequently while playing.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentScene?.audioUrl || !isPlaying || isRendering) return;

    const desiredAudioTime = timeInScene / 1000;
    // FIX: Cast to `any` to bypass incorrect TypeScript errors about missing properties.
    if (Math.abs((audio as any).currentTime - desiredAudioTime) > 0.3) {
        (audio as any).currentTime = desiredAudioTime;
    }
  }, [timeInScene, currentScene?.audioUrl, isPlaying, isRendering]);

  // Effect for managing scene media sources and playback. Runs on scene or play state change.
  useEffect(() => {
    const videoA = videoRefA.current;
    const videoB = videoRefB.current;
    const audio = audioRef.current;

    if (!videoA || !videoB || !audio || isRendering) return;
    
    // Set video current time based on global clock
    const syncVideoTime = (videoEl: HTMLVideoElement) => {
        if (!videoEl.src) return;
        const desiredVideoTime = (timeInScene / 1000) % videoEl.duration;
         if (Math.abs(videoEl.currentTime - desiredVideoTime) > 0.3) {
            videoEl.currentTime = desiredVideoTime;
        }
    }

    if (sceneIndex < 0 || sceneIndex >= scenes.length) {
      (videoA as any).pause();
      (videoB as any).pause();
      (audio as any).pause();
      return;
    }
    
    const activePlayer = activePlayerIndex === 0 ? videoA : videoB;
    const preloadPlayer = activePlayerIndex === 0 ? videoB : videoA;
    if (sceneIndex % 2 !== activePlayerIndex) {
        setActivePlayerIndex(sceneIndex % 2);
    }
    
    const currentVideoFile = findBestVideoUrl(currentScene.video);
    if ((activePlayer as any).src !== currentVideoFile) {
      (activePlayer as any).pause();
      (activePlayer as any).src = currentVideoFile;
    } else {
        syncVideoTime(activePlayer);
    }
    
    if (isPlaying) {
      (activePlayer as any).play().catch((e: any) => e.name !== 'AbortError' && console.error("Video Play Error:", e));
    } else {
      (activePlayer as any).pause();
    }
    
    if (currentScene.audioUrl) {
      if ((audio as any).src !== currentScene.audioUrl) {
        (audio as any).pause();
        (audio as any).src = currentScene.audioUrl;
      }
      if (isPlaying) {
        (audio as any).play().catch((e: any) => e.name !== 'AbortError' && console.error("Audio Play Error:", e));
      } else {
        (audio as any).pause();
      }
    } else {
      (audio as any).pause();
      (audio as any).src = '';
    }
    
    const nextScene = scenes[sceneIndex + 1];
    if(nextScene) {
      const nextVideoFile = findBestVideoUrl(nextScene.video);
      if((preloadPlayer as any).src !== nextVideoFile) (preloadPlayer as any).src = nextVideoFile;
    }
  }, [sceneIndex, isPlaying, scenes, activePlayerIndex, isRendering, timeInScene]);

  const handlePlayPause = () => {
    if (isFinished) {
      setCurrentTime(0);
      setIsFinished(false);
      if (bgAudioRef.current) (bgAudioRef.current as any).currentTime = 0;
    }
    setIsPlaying(!isPlaying);
  };
  
  const seekTo = (time: number) => {
    const newTime = Math.max(0, Math.min(time, totalDuration));
    setCurrentTime(newTime);
    setIsFinished(newTime >= totalDuration);
    
    if (isPlaying) {
        playbackStartTimeRef.current = performance.now();
        timeAtStartRef.current = newTime;
    }

    if(seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    const wasPlaying = isPlaying;
    if(wasPlaying) setIsPlaying(false);
    if (typeof window !== 'undefined') {
      seekTimeoutRef.current = (window as any).setTimeout(() => {
          if(wasPlaying && newTime < totalDuration) setIsPlaying(true);
      }, 150);
    }
  }

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isRendering) return;
    const rect = (e.currentTarget as any).getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * totalDuration;
    seekTo(newTime);
  };

  const handleNextScene = () => {
    const nextSceneTiming = sceneTimings[sceneIndex + 1];
    if (nextSceneTiming) seekTo(nextSceneTiming.startTime);
    else if (closingSceneConfig.enabled) seekTo(totalDuration - CLOSING_SCENE_DURATION);
  };

  const handlePrevScene = () => {
    if (timeInScene > 2000 && sceneIndex > 0) {
        seekTo(sceneTimings[sceneIndex].startTime);
    } else {
        const prevSceneTiming = sceneTimings[sceneIndex - 1];
        if (prevSceneTiming) seekTo(prevSceneTiming.startTime);
        else seekTo(0);
    }
  };

  const getPlayerClassName = (index: number) => {
    const isCurrentActive = sceneIndex % 2 === index;
    return `video-player ${isCurrentActive && !isClosingScene && !isCoverScene ? 'opacity-100' : 'opacity-0'}`;
  }

  const getVerticalAlignClass = (align: 'top' | 'middle' | 'bottom') => {
    return {'top': 'justify-start', 'middle': 'justify-center', 'bottom': 'justify-end'}[align] || 'justify-end';
  };

  const getTextAlignClass = (align: 'left' | 'center' | 'right') => {
    return {'left': 'text-left', 'center': 'text-center', 'right': 'text-right'}[align] || 'text-center';
  };

  const subtitleStyle: React.CSSProperties = {
    color: subtitleConfig.textColor,
    fontSize: `${scaledFontSize}px`,
    fontFamily: subtitleConfig.fontFamily,
    fontWeight: subtitleConfig.fontWeight,
    textShadow: subtitleConfig.shadowConfig.enabled 
      ? `${subtitleConfig.shadowConfig.offsetX}px ${subtitleConfig.shadowConfig.offsetY}px ${subtitleConfig.shadowConfig.blur}px ${subtitleConfig.shadowConfig.color}`
      : 'none',
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <style>{`
        .video-player {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
      `}</style>
      <div ref={previewContainerRef} className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-lg shadow-2xl overflow-hidden mx-auto">
        <video ref={videoRefA} className={getPlayerClassName(0)} muted playsInline loop />
        <video ref={videoRefB} className={getPlayerClassName(1)} muted playsInline loop />
        <audio ref={audioRef} />
        <audio ref={bgAudioRef} loop />

        {isCoverScene && <SceneOverlay config={coverSceneConfig} />}
        {isClosingScene && <SceneOverlay config={closingSceneConfig} />}

        <div className={`absolute inset-0 flex flex-col p-4 md:p-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10 ${getVerticalAlignClass(subtitleConfig.verticalAlign)}`}>
          <p className={`w-full font-bold leading-tight ${getTextAlignClass(subtitleConfig.textAlign)}`} style={subtitleStyle}>
            {!isClosingScene && !isCoverScene && currentScene?.script && (
              <span>{currentScene.script}</span>
            )}
          </p>
        </div>

        {!isPlaying && !isRendering && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <button onClick={handlePlayPause} className="text-white bg-white/20 rounded-full p-6 backdrop-blur-sm">
              {isFinished ? <ReplayIcon className="w-16 h-16"/> : <PlayIcon className="w-16 h-16"/>}
            </button>
          </div>
        )}
        
        {isRendering && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 text-white p-4">
            <LoadingIcon className="w-12 h-12 animate-spin text-purple-400" />
            <p className="mt-4 text-lg font-semibold">{renderMessage}</p>
            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
              <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${renderProgress}%` }}></div>
            </div>
            <p className="text-sm mt-1">{Math.round(renderProgress)}%</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mx-auto mt-4 p-2 space-y-2">
         <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
            <span>{formatTime(currentTime)}</span>
            <div onClick={handleScrub} className={`flex-grow bg-white/20 h-2 rounded-full relative group ${isRendering ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${progress}%` }} />
                  <div className="absolute h-4 w-4 bg-purple-400 rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%` }}/>
            </div>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-white">
             <button onClick={() => seekTo(0)} title="Ir al Inicio" disabled={isRendering} className="disabled:opacity-50"><ToStartIcon className="w-6 h-6"/></button>
             <button onClick={handlePrevScene} title="Escena Anterior" disabled={isRendering} className="disabled:opacity-50"><PreviousIcon className="w-7 h-7"/></button>
             <button onClick={handlePlayPause} className="w-10 h-10 flex items-center justify-center" disabled={isRendering}>
                {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
             </button>
             <button onClick={handleNextScene} title="Siguiente Escena" disabled={isRendering} className="disabled:opacity-50"><NextIcon className="w-7 h-7"/></button>
             <button onClick={() => seekTo(closingSceneConfig.enabled ? totalDuration-CLOSING_SCENE_DURATION : totalDuration-1)} title="Ir al Final" disabled={isRendering} className="disabled:opacity-50"><ToEndIcon className="w-6 h-6"/></button>
             <button onClick={onDownload} title="Descargar Video HD" disabled={isRendering} className="disabled:opacity-50 text-purple-400 hover:text-purple-300">
                <DownloadIcon className="w-7 h-7"/>
             </button>
          </div>
      </div>
    </div>
  );
};

const HighlightedText: React.FC<{text: string, color: string, highlightColor: string}> = ({ text, color, highlightColor }) => {
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

const SceneOverlay: React.FC<{config: CoverSceneConfig | ClosingSceneConfig}> = ({ config }) => {
  if (!config.enabled) return null;
  const getTextAlignClass = (align: 'left' | 'center' | 'right') => ({'left':'text-left','center':'text-center','right':'text-right'}[align] || 'text-center');
  const isCoverConfig = 'backgroundImageUrl' in config;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 z-30" style={{backgroundColor: config.backgroundColor}}>
       {isCoverConfig && config.backgroundImageUrl && (
            <img src={config.backgroundImageUrl} alt="Cover background" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {isCoverConfig && config.overlayEnabled && (
             <div className="absolute inset-0" style={{ backgroundColor: config.overlayColor, opacity: config.overlayOpacity }}></div>
        )}

      <div className={`relative flex w-full ${config.textPosition === 'above' ? 'flex-col-reverse' : 'flex-col'} items-center`}>
        {config.logoUrl && (!('logoEnabled' in config) || config.logoEnabled) && <img src={config.logoUrl} alt="logo" className="object-contain my-4" style={{ width: `${config.logoSize}%` }}/>}
        {config.textEnabled && (
          // FIX: Removed conditional logic that caused a 'never' type error. The HighlightedText component is now used directly as it handles both cases.
          <p className={`w-full font-bold text-2xl ${getTextAlignClass(config.textAlign)}`} style={{color: config.textColor}}>
            <HighlightedText text={config.text} color={config.textColor} highlightColor={config.highlightTextColor} />
          </p>
        )}
      </div>
    </div>
  );
};

export default VideoPreview;