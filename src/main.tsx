console.log("main.tsx: START");
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

console.log("main.tsx: IMPORTS DONE");

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log("main.tsx: RENDERING");
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  console.log("main.tsx: RENDER CALLED");
} else {
  console.error("main.tsx: ROOT NOT FOUND");
}
