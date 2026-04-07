window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Global Error: ', msg, url, lineNo, columnNo, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color: white; background: #050810; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
      <div>
        <h1 style="color: #ff3366;">Critical Load Error</h1>
        <p style="color: #7a9cc0;">${msg}</p>
        <button onclick="window.location.reload()" style="background: #00d4ff; color: #050810; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 20px;">Retry</button>
      </div>
    </div>`;
  }
  return false;
};
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
