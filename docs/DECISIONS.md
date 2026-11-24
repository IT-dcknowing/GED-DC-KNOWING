# Journal des décisions

| Date | Décision | Référence |
|------|----------|-----------|
| 24/11/2026 | Dépôt Git local initialisé, branche `main` (aucun dépôt distant) | Rapport d'audit, plan étape 1 |
| 24/11/2026 | `.env` corrigé : `APP_NAME` entre guillemets | ENV-01 |
| 24/11/2026 | Frontend React dans un dossier séparé `frontend/` (option B), avec son propre `package.json` ; Laravel sert uniquement l'API `/api/v1` | Section 9.1 du rapport ; remplace l'option A recommandée |
| 24/11/2026 | TypeScript pour le frontend | Q-24 |
| 24/11/2026 | URL de développement : backend `http://localhost:8004`, frontend `http://localhost:5173` (proxy Vite vers le backend) | Q-22 |
| 24/11/2026 | Authentification Sanctum par cookie de session (SPA) | Section 9.2 |
| 24/11/2026 | Laravel Boost non installé pour l'instant | Q-21 |
| 24/11/2026 | Migrations de base exécutées sur MySQL (`ged-dc-knowing`) | ENV-05 |

Questions encore ouvertes : voir la section 12 de `docs/audit/RAPPORT_AUDIT_PHASE_1.md`.
