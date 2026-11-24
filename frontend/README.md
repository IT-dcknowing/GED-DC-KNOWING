# GED DC-KNOWING : frontend

Application React (TypeScript) de la GED. Elle ne communique avec Laravel que par l'API REST `/api/v1`.

## Lancer en développement

Deux serveurs, dans deux terminaux :

```powershell
# 1. Backend Laravel (à la racine du projet)
php artisan serve --host=127.0.0.1 --port=8004

# 2. Frontend (dans ce dossier)
npm run dev
```

Ouvrir **http://localhost:5173**. Vite transmet `/api` et `/sanctum` au backend (port 8004) : le navigateur ne voit qu'une seule origine, sans configuration CORS, et le cookie de session Sanctum fonctionne. Les domaines autorisés sont déclarés dans `SANCTUM_STATEFUL_DOMAINS` du `.env` Laravel.

Pour viser un autre backend : variable d'environnement `VITE_BACKEND_URL`.

## Commandes

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement (port 5173) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests (Vitest, Testing Library) |
| `npm run build` | Vérification TypeScript puis compilation dans `dist/` |

## Organisation

```
src/
  main.tsx          point d'entrée
  app/              fournisseurs (TanStack Query) et routes (React Router)
  api/              client Axios et appels par ressource
  features/         un dossier par module de l'application
  styles/app.css    Tailwind et jetons de couleur du cahier des charges
  test/setup.ts     configuration des tests
```

L'alias `@/` pointe vers `src/`.

## Production

Le mode de mise en ligne (fichiers de `dist/` servis par le serveur web, `/api` transmis à Laravel) dépend de l'hébergement, non encore décidé (question Q-03 du rapport d'audit).
