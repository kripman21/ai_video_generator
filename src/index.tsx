
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// FIX: Cast `window` to `any` to access the `document` property, resolving a TypeScript error that occurs when the 'dom' library is not included in the tsconfig.
const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
