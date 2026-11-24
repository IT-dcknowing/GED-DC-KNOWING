# Journal des décisions

| Date | Décision | Référence |
|------|----------|-----------|
| 24/11/2026 | Dépôt Git initialisé, branche `main`, publié sur `https://github.com/IT-dcknowing/GED-DC-KNOWING` | Rapport d'audit, plan étape 1 |
| 24/11/2026 | `.env` corrigé : `APP_NAME` entre guillemets | ENV-01 |
| 24/11/2026 | Frontend React dans un dossier séparé `frontend/` (option B), avec son propre `package.json` ; Laravel sert uniquement l'API `/api/v1` | Section 9.1 du rapport ; remplace l'option A recommandée |
| 24/11/2026 | TypeScript pour le frontend | Q-24 |
| 24/11/2026 | URL de développement : backend `http://localhost:8004`, frontend `http://localhost:5173` (proxy Vite vers le backend) | Q-22 |
| 24/11/2026 | Authentification Sanctum par cookie de session (SPA) | Section 9.2 |
| 24/11/2026 | Laravel Boost non installé pour l'instant | Q-21 |
| 24/11/2026 | Migrations de base exécutées sur MySQL (`ged-dc-knowing`) | ENV-05 |
| 24/11/2026 | Modèle des droits : **rôle (actions) + périmètre (département, client, dossier)**, sans droits par document en v1. Droits hérités vers le bas de l'arborescence ; espaces restreints fermés par défaut ; lecture seule liée à l'état (archivé, modèle) prioritaire sur tout droit ; uniquement des autorisations, pas d'interdictions explicites | Q-01 |

| 24/11/2026 | Authentification : conception validée (`docs/conception/AUTHENTIFICATION.md`). Mots de passe : 10 à 64 caractères, majuscule, minuscule, chiffre, bcrypt, refus de l'actuel et des 2 précédents. Verrouillage 15 minutes après 5 échecs consécutifs, par adresse e-mail. Sessions de 30 minutes d'inactivité. Journal d'audit en table dédiée, en ajout seul | Demande « Authentification » |
| 24/11/2026 | Mot de passe temporaire affiché une seule fois à l'administrateur ; réinitialisation par l'administrateur = nouveau mot de passe temporaire ; « administrateur technique » = Super Administrateur | Conception authentification, section 0 |
| 24/11/2026 | Suppression de la route `/api/user` (installée avec Sanctum) : elle contournait le contrôle du compte actif et du changement de mot de passe obligatoire ; remplacée par `/api/v1/auth/me` | Règles B4, E4 |
| 24/11/2026 | Limites de requêtes nommées, une par route (`login`, `password-forgot`, `password-reset`, `password-update`) : avec les limites par défaut, des échecs de connexion bloquaient la demande de réinitialisation | Correction pendant l'implémentation |
| 24/11/2026 | Comptes de test, un par rôle, créés par `DevelopmentAccountsSeeder` (adresses `@ged.test`, département `DEP-TEST`, mots de passe temporaires à changer à la première connexion). Le seeder refuse de s'exécuter en production | Demande de comptes de recette |
| 24/11/2026 | Tests API Postman dans `docs/postman/` (collection générée par `scripts/build-collection.mjs`, environnement local, guide). Comptes `@postman.test` à mots de passe connus et documentés, créés par `PostmanTestAccountsSeeder`, limité aux environnements local et testing | Mission « Tests API Postman » |
| 24/11/2026 | Connexion sans session (requête sans Referer/Origin d'un domaine autorisé) : refus 400 `SESSION_REQUIRED` au lieu d'une erreur 500 qui journalisait à tort une connexion réussie | Défaut trouvé pendant l'audit Postman |
| 24/11/2026 | Erreurs 404 et 405 de l'API au même format que les autres (message en français, code `NOT_FOUND` / `METHOD_NOT_ALLOWED`, sans trace technique même en mode débogage) | Défaut trouvé par la collection Postman |

## Réglages provisoires (à faire confirmer par DC-KNOWING)

Ils sont appliqués pour avancer et peuvent être modifiés sans refonte.

| Sujet | Réglage provisoire | Où le modifier | Référence |
|-------|--------------------|----------------|-----------|
| Visibilité des clients pour un collaborateur | Tous les clients de son département | Phase 2 (périmètres) | Q-14 |
| Attribution des accès exceptionnels | Super Administrateur uniquement (permission `access-grants.manage`) | `app/Enums/RoleName.php` | Q-01 |
| Espaces 00_DIRECTION, 03_RH_CABINET, 99_ARCHIVES | Fermés par défaut, ouverts par autorisation explicite | Phase 2 | Q-11 |
| Matrice rôles / permissions | Reprise de la maquette v1.1 (le Directeur peut valider ; l'Auditeur peut télécharger) | `app/Enums/RoleName.php`, puis `php artisan db:seed --class=RolesAndPermissionsSeeder` | Q-12, Q-15 |
| Envoi des e-mails | `MAIL_MAILER=log` en développement (les e-mails sont écrits dans `storage/logs/laravel.log`) ; serveur SMTP et adresse d'expéditeur à fournir avant la production | `.env` | Section 15 du CDC |
| Un seul cabinet géré par l'application | Pas de table « cabinet » | n/a | Q-09 |

Questions encore ouvertes : voir la section 12 de `docs/audit/RAPPORT_AUDIT_PHASE_1.md`.
