import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@/styles/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Élément #root introuvable dans la page.');
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
