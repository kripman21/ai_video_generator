

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  label: string;
  // FIX: Change icon type to be more specific for type safety with React.cloneElement
  icon: React.ReactElement<{ className?: string }>;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const getActiveTabStyle = (isActive: boolean) => {
    return isActive
      ? 'text-purple-300 border-purple-400'
      : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setActiveTabIndex(index)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors focus:outline-none ${getActiveTabStyle(
                index === activeTabIndex
              )}`}
            >
              {/* FIX: The icon type is now more specific, so cloneElement works without casting. */}
              {React.cloneElement(tab.icon, { className: 'w-5 h-5' })}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-grow pt-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTabIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs[activeTabIndex].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tabs;