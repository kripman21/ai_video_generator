import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Scene, BackgroundMusic, PexelsVideo, ClosingSceneConfig, SubtitleConfig, CoverSceneConfig } from './types';
import { generateScenesFromScript, generateTTS } from './services/geminiService';
import { searchPexelsVideos } from './services/pexelsService';
import { decode, pcmToWavBlob } from './utils/audioUtils';
import { renderVideo } from './services/videoRenderService';
import ScriptInput from './components/ScriptInput';
import SceneEditor from './components/SceneEditor';
import VideoPreview from './components/VideoPreview';
import { LoadingIcon, VideoIcon, MusicIcon, KeyIcon, StarIcon, TextIcon, PlusIcon } from './components/Icons';
import MusicSelector from './components/MusicSelector';
import ApiKeyModal from './components/ApiKeyModal';
import ClosingSceneEditor from './components/ClosingSceneEditor';
import Tabs from './components/Tabs';
import SubtitleEditor from './components/SubtitleEditor';
import CoverSceneEditor from './components/CoverSceneEditor';

const App: React.FC = () => {
  const [script, setScript] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [backgroundMusic, setBackgroundMusic] = useState<BackgroundMusic | null>(null);
  const [pexelsApiKey, setPexelsApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState('');

  const defaultPexelsApiKey = import.meta.env.VITE_PEXELS_API_KEY || '';
  const exampleScript = `Unveiling the top 3 secrets to a successful morning routine.
First, wake up early. This gives you quiet time for yourself before the day's chaos begins.
Second, hydrate. A glass of water before anything else kickstarts your metabolism.
Finally, plan your day. A few minutes of planning can save hours of wasted time.
Follow these tips for a more productive and peaceful life.`;

  const initialCoverConfig: CoverSceneConfig = {
    enabled: false,
    logoUrl: null,
    logoEnabled: true,
    backgroundColor: '#000000',
    backgroundImageUrl: null,
    overlayEnabled: false,
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    logoSize: 70,
    textEnabled: true,
    text: 'Your *Brand*',
    textColor: '#FFFFFF',
    highlightTextColor: '#8B5CF6', // purple-500
    textPosition: 'below',
    textAlign: 'center',
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 'bold',
  };

  const initialClosingConfig: ClosingSceneConfig = {
    enabled: false,
    logoUrl: null,
    backgroundColor: '#000000',
    logoSize: 70,
    textEnabled: true,
    text: 'Your Brand',
    textColor: '#FFFFFF',
    highlightTextColor: '#8B5CF6', // purple-500
    textPosition: 'below',
    textAlign: 'center',
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 'bold',
  };

  const initialSubtitleConfig: SubtitleConfig = {
    textAlign: 'center',
    verticalAlign: 'bottom',
    fontSize: 50,
    textColor: '#FFFFFF',
    highlightTextColor: '#8B5CF6', // purple-500
    fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    fontWeight: 'bold',
    shadowConfig: {
      enabled: true,
      color: '#000000',
      offsetX: 2,
      offsetY: 2,
      blur: 4,
    },
  };

  const [coverSceneConfig, setCoverSceneConfig] = useState<CoverSceneConfig>(initialCoverConfig);
  const [closingSceneConfig, setClosingSceneConfig] = useState<ClosingSceneConfig>(initialClosingConfig);
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>(initialSubtitleConfig);

  useEffect(() => {
    let key = localStorage.getItem('pexelsApiKey');
    if (!key) {
      key = defaultPexelsApiKey;
      localStorage.setItem('pexelsApiKey', key);
    }
    setPexelsApiKey(key);
  }, []);

  const handleSaveApiKey = (key: string) => {
    const keyToSave = key.trim();
    if (keyToSave) {
      setPexelsApiKey(keyToSave);
      localStorage.setItem('pexelsApiKey', keyToSave);
    } else {
      // If user clears the key, revert to default
      setPexelsApiKey(defaultPexelsApiKey);
      localStorage.setItem('pexelsApiKey', defaultPexelsApiKey);
    }
  };

  const handleGenerate = useCallback(async (withAudio: boolean, scriptToUse?: string) => {
    const currentScript = scriptToUse ?? script;
    if (!currentScript.trim()) {
      setError('Please enter a script.');
      return;
    }

    if (!pexelsApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setScenes([]);

    try {
      setLoadingMessage('Analizando guion y creando escenas...');
      const structuredScenes = await generateScenesFromScript(currentScript);

      const scenesWithMedia: Scene[] = await Promise.all(
        structuredScenes.map(async (sceneData, index) => {
          setLoadingMessage(`Buscando video para la escena ${index + 1}...`);
          const videos: PexelsVideo[] = await searchPexelsVideos(sceneData.description, pexelsApiKey);
          const video = videos[0] || null;

          let audioUrl: string | null = null;
          let durationMs: number;

          if (withAudio) {
            setLoadingMessage(`Generando locución para la escena ${index + 1}...`);
            const audioData = await generateTTS(sceneData.script);
            const audioBlob = pcmToWavBlob(decode(audioData));
            audioUrl = URL.createObjectURL(audioBlob);

            try {
              durationMs = await new Promise<number>((resolve) => {
                // FIX: Cast `window` to `any` to access `Audio` constructor, resolving TypeScript error.
                const audio = new (window as any).Audio(audioUrl!);
                audio.addEventListener('loadedmetadata', () => {
                  if (isFinite(audio.duration)) {
                    resolve(audio.duration * 1000);
                  } else {
                    resolve((video?.duration || 5) * 1000);
                  }
                });
                audio.addEventListener('error', () => {
                  resolve((video?.duration || 5) * 1000);
                });
              });
            } catch {
              durationMs = (video?.duration || 5) * 1000;
            }
          } else {
            // For sample videos without audio, set a default duration of 3 seconds.
            durationMs = 3000;
          }

          return {
            id: `scene-${Date.now()}-${index}`,
            ...sceneData,
            video: video,
            audioUrl: audioUrl,
            duration: Math.round(durationMs),
          };
        })
      );

      setScenes(scenesWithMedia);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [script, pexelsApiKey]);

  const handleGenerateVideo = () => handleGenerate(true);

  const handleGenerateSample = () => {
    if (!script.trim()) {
      setScript(exampleScript);
      handleGenerate(false, exampleScript);
    } else {
      handleGenerate(false);
    }
  };

  const updateScene = (updatedScene: Scene) => {
    setScenes(prevScenes =>
      prevScenes.map(scene =>
        scene.id === updatedScene.id ? updatedScene : scene
      )
    );
  };

  const handleReorder = (newScenes: Scene[]) => {
    setScenes(
      newScenes.map((scene, index) => ({
        ...scene,
        scene_number: index + 1,
      }))
    );
  };

  const addScene = (index: number) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      scene_number: index + 1,
      description: 'New scene description',
      script: 'New script text.',
      video: null,
      audioUrl: null,
      duration: 3000, // 3 seconds default for new scenes
    };

    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes.splice(index, 0, newScene);
      // Re-number all scenes
      return newScenes.map((scene, idx) => ({
        ...scene,
        scene_number: idx + 1,
      }));
    });
  };

  const deleteScene = (id: string) => {
    setScenes(prevScenes => {
      const newScenes = prevScenes.filter(scene => scene.id !== id);
      // Re-number all scenes
      return newScenes.map((scene, index) => ({
        ...scene,
        scene_number: index + 1,
      }));
    });
  };

  const handleDownloadVideo = async () => {
    if (scenes.length === 0) {
      toast.warning("Por favor, genera las escenas antes de descargar.");
      return;
    }
    setIsRendering(true);
    setRenderProgress(0);
    setRenderMessage('Inicializando renderizador...');
    try {
      await renderVideo(
        scenes,
        backgroundMusic,
        coverSceneConfig,
        closingSceneConfig,
        subtitleConfig,
        (progress, message) => {
          setRenderProgress(progress);
          setRenderMessage(message);
        }
      );
    } catch (err) {
      console.error("Rendering failed:", err);
      toast.error("La renderización falló. Revisa la consola.");
    } finally {
      setIsRendering(false);
    }
  };

  const handleCreateNewVideo = () => {
    toast("¿Estás seguro? Se perderá el progreso actual.", {
      action: {
        label: 'Confirmar',
        onClick: () => {
          setScript('');
          setScenes([]);
          setBackgroundMusic(null);
          setCoverSceneConfig(initialCoverConfig);
          setClosingSceneConfig(initialClosingConfig);
          setSubtitleConfig(initialSubtitleConfig);
          setError(null);
        }
      },
      cancel: {
        label: 'Cancelar',
      },
    });
  };


  const editorTabs = [
    {
      label: 'Portada',
      icon: <StarIcon className="transform rotate-180" />,
      content: (
        <CoverSceneEditor
          config={coverSceneConfig}
          setConfig={setCoverSceneConfig}
          pexelsApiKey={pexelsApiKey}
          subtitleConfig={subtitleConfig}
          setSubtitleConfig={setSubtitleConfig}
          closingSceneConfig={closingSceneConfig}
          setClosingSceneConfig={setClosingSceneConfig}
        />
      ),
    },
    {
      label: 'Escenas',
      icon: <VideoIcon />,
      content: (
        <SceneEditor
          scenes={scenes}
          updateScene={updateScene}
          pexelsApiKey={pexelsApiKey}
          onReorder={handleReorder}
          onAddScene={addScene}
          onDeleteScene={deleteScene}
        />
      ),
    },
    {
      label: 'Texto',
      icon: <TextIcon />,
      content: (
        <SubtitleEditor
          config={subtitleConfig}
          setConfig={setSubtitleConfig}
        />
      ),
    },
    {
      label: 'Música',
      icon: <MusicIcon />,
      content: (
        <MusicSelector
          music={backgroundMusic}
          setMusic={setBackgroundMusic}
        />
      ),
    },
    {
      label: 'Escena Final',
      icon: <StarIcon />,
      content: (
        <ClosingSceneEditor
          config={closingSceneConfig}
          setConfig={setClosingSceneConfig}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {showApiKeyModal && (
        <ApiKeyModal
          currentKey={pexelsApiKey}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleSaveApiKey}
        />
      )}

      <header className="bg-gray-800 shadow-lg p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-wider text-purple-400 flex items-center">
          <VideoIcon className="w-8 h-8 mr-3" />
          Generador de Video Vertical con IA
        </h1>
        <div className="flex items-center gap-4">
          {scenes.length > 0 && !isLoading && !isRendering && (
            <button
              onClick={handleCreateNewVideo}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              title="Crear un nuevo video"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Crear Nuevo Video</span>
            </button>
          )}
          <button onClick={() => setShowApiKeyModal(true)} className="text-gray-400 hover:text-white" title="Configurar API Key de Pexels">
            <KeyIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {scenes.length === 0 ? (
            <ScriptInput
              script={script}
              setScript={setScript}
              onGenerateVideo={handleGenerateVideo}
              onGenerateSample={handleGenerateSample}
              isDisabled={isLoading}
            />
          ) : (
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl h-[85vh] flex flex-col">
              <VideoPreview
                scenes={scenes}
                backgroundMusic={backgroundMusic}
                coverSceneConfig={coverSceneConfig}
                closingSceneConfig={closingSceneConfig}
                subtitleConfig={subtitleConfig}
                isRendering={isRendering}
                renderProgress={renderProgress}
                renderMessage={renderMessage}
                onDownload={handleDownloadVideo}
              />
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl h-[85vh] flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingIcon className="w-12 h-12 animate-spin text-purple-400" />
                <p className="mt-4 text-lg">{loadingMessage}</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400">
                <p>Error: {error}</p>
              </div>
            ) : scenes.length > 0 ? (
              <Tabs tabs={editorTabs} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <h2 className="text-xl font-semibold mb-4 text-purple-300 border-b border-gray-700 pb-2">Editor</h2>
                <p className="text-center mt-4">Tus escenas generadas aparecerán aquí. <br /> Comienza escribiendo un guion y haciendo clic en "Generar Video".</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;