
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Global shim for process.env to support browser-side environment variables
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  // If the bundler hasn't injected the key, we ensure it's at least an empty string to avoid crashes
  if (win.process.env.API_KEY === undefined) {
    win.process.env.API_KEY = ""; 
  }
}

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Critical error mounting the app:", error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
