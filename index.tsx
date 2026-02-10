
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Shim process.env for browser compatibility
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Target container 'root' not found. Retrying...");
    setTimeout(mountApp, 100);
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("TGC App mounted successfully.");
  } catch (error) {
    console.error("Failed to mount React app:", error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
