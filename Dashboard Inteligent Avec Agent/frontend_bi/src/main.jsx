import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BiPlatformProvider } from './context/BiPlatformContext';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BiPlatformProvider>
        <App />
      </BiPlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
