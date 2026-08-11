import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/learnerMapPrint.css';
import './utils/injectTargetIndexTableGeometry';
import './utils/injectSnapshotPrintPageCss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
