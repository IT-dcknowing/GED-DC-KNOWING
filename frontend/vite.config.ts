/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Backend Laravel (API REST). En développement, Vite lui transmet /api et /sanctum :
// le navigateur ne voit qu'une seule origine (localhost:5173), donc pas de CORS
// et le cookie de session Sanctum fonctionne normalement.
const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:8004';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': { target: BACKEND_URL },
            '/sanctum': { target: BACKEND_URL },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    test: {
        environment: 'jsdom',
        // Threads plutôt que processus séparés : sur ce poste, le démarrage d'un processus
        // de test dépasse le délai de Vitest (échec « Timeout waiting for worker to respond »).
        pool: 'threads',
        include: ['src/**/*.test.{ts,tsx}'],
        setupFiles: ['src/test/setup.ts'],
    },
});
