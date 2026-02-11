
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/**
 * Global shim for process.env to ensure compatibility with the Google GenAI SDK.
 * This ensures that if the bundler hasn't provided a global 'process' object,
 * the SDK won't crash when trying to access process.env.API_KEY.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.process) {
    win.process = { env: {} };
  } else if (!win.process.env) {
    win.process.env = {};
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
