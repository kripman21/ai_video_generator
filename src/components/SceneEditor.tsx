import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scene } from '../types';
import SceneCard from './SceneCard';
import { PlusIcon } from './Icons';

interface SceneEditorProps {
  scenes: Scene[];
  updateScene: (scene: Scene) => void;
  pexelsApiKey: string | null;
  onReorder: (scenes: Scene[]) => void;
  onAddScene: (index: number) => void;
  onDeleteScene: (id: string) => void;
}

const AddSceneButton: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="relative group py-2 my-[-8px]">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-dashed border-gray-600 group-hover:border-purple-500 transition-colors" />
    </div>
    <div className="relative flex justify-center">
      <button
        onClick={onAdd}
        className="z-10 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110 hover:bg-purple-600 hover:text-white"
        aria-label="Añadir nueva escena aquí"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  </div>
);


const SceneEditor: React.FC<SceneEditorProps> = ({ scenes, updateScene, pexelsApiKey, onReorder, onAddScene, onDeleteScene }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setTimeout(() => {
      setIsDragging(true);
    }, 0);
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newScenes = [...scenes];
      const [draggedItemContent] = newScenes.splice(dragItem.current, 1);
      newScenes.splice(dragOverItem.current, 0, draggedItemContent);
      onReorder(newScenes);
    }

    setIsDragging(false);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="flex-grow overflow-y-auto pr-2">
      {scenes.length === 0 && <AddSceneButton onAdd={() => onAddScene(0)} />}

      <AnimatePresence mode="popLayout">
        {scenes.map((scene, index) => (
          <React.Fragment key={scene.id}>
            {index === 0 && <AddSceneButton onAdd={() => onAddScene(0)} />}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`cursor-grab active:cursor-grabbing my-3 ${isDragging && dragItem.current === index ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
                }`}
            >
              <SceneCard
                scene={scene}
                updateScene={updateScene}
                pexelsApiKey={pexelsApiKey}
                onDelete={onDeleteScene}
              />
            </motion.div>
            <AddSceneButton onAdd={() => onAddScene(index + 1)} />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SceneEditor;