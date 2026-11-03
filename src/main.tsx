import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const savedDark = localStorage.getItem('dq-theme') === 'dark';
const hasSession = Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('auth-token'));
if (savedDark && hasSession) document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
