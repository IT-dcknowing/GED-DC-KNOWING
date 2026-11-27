# AUDIT COMPLET — ÉTAT D'AVANCEMENT DU PROJET GED DC-KNOWING

> **Document généré le 27 novembre 2026**
> Basé sur une exploration méthodique du dépôt `c:\laragon\www\GED-DC-KNOWING-main`.
> Ce rapport est un audit technique et fonctionnel fondé exclusivement sur le code existant, les migrations, les routes, les tests et la documentation présente dans le dépôt.

---

## 1. Présentation générale du projet

### 1.1 Objectif du projet

**GED DC-KNOWING** est une application de Gestion Électronique de Documents (GED) destinée au cabinet d'expertise comptable DC-KNOWING (CGA). Elle vise à centraliser et organiser les documents clients, gérer les droits d'accès par rôle et périmètre, assurer le suivi des exercices annuels, et proposer des circuits de validation documentaire. Le projet est décrit dans le cahier des charges v1.1 (`Cahier_des_charges_GED_DC_KNOWING_v1.1.docx`).

### 1.2 Technologies utilisées

| Couche | Technologie | Version |
|--------|-------------|---------|
| Langage backend | PHP | 8.3.30 |
| Framework backend | Laravel | ^13.17 |
| Authentification API | Laravel Sanctum (cookie SPA) | ^4.0 |
| Gestion des rôles/permissions | spatie/laravel-permission | 8.0 |
| Journal d'activité | spatie/laravel-activitylog | 4.12.3 |
| Export PDF | barryvdh/laravel-dompdf | ^3.1 |
| Export Excel | maatwebsite/excel | ^4.0 |
| ORM | Eloquent (Laravel) | — |
| Framework frontend | React | ^19.3.1 |
| Langage frontend | TypeScript | ^7.0.2 |
| Routeur frontend | React Router | ^8.5.2 |
| Gestion d'état serveur | TanStack Query (React Query) | ^5.108.4 |
| Formulaires | React Hook Form + Zod | ^7.92.0 / ^4.6.7 |
| Client HTTP | Axios | ^1.21.1 |
| CSS | Tailwind CSS v4 | ^4.0.0 |
| Icônes | Lucide React | ^1.79.0 |
| Build tool | Vite | ^8.0.0 |
| Tests backend | PHPUnit | ^12.5.12 |
| Tests frontend | Vitest + Testing Library | ^5.1.1 |
| Base de données (dev) | MySQL (`ged-dc-knowing`) | — |
| Base de données (défaut .env.example) | SQLite | — |
| Gestion des dépendances backend | Composer | 2.9.1 |
| Gestion des dépendances frontend | npm | — |

### 1.3 Architecture générale

```
GED-DC-KNOWING-main/
├── app/                          # Backend Laravel
│   ├── Console/Commands/         # Commande artisan ged:create-admin
│   ├── Enums/                    # AuditEvent, PermissionName, RoleName
│   ├── Http/
│   │   ├── Controllers/Api/V1/   # Contrôleurs REST versionnés
│   │   ├── Middleware/           # Middleware de sécurité
│   │   ├── Requests/             # Form Requests (validation)
│   │   └── Resources/            # API Resources (sérialisation)
│   ├── Models/                   # Modèles Eloquent
│   ├── Notifications/            # Notification de réinitialisation mdp
│   ├── Policies/                 # Policies de contrôle d'accès
│   ├── Providers/                # AppServiceProvider
│   ├── Rules/                    # Règle StrongPassword
│   └── Services/                 # Logique métier (Security, Organisation)
├── database/
│   ├── migrations/               # 10 fichiers de migration
│   ├── seeders/                  # 4 seeders (rôles, comptes de test)
│   └── factories/                # UserFactory
├── docs/                         # Documentation projet
│   ├── PLAN_BACKEND.md           # Plan de développement lot par lot
│   ├── DECISIONS.md              # Journal des décisions
│   ├── audit/                    # Rapports d'audit
│   ├── conception/               # Conception de l'authentification
│   ├── postman/                  # Collection Postman
│   └── rapports/                 # Rapports d'activité
├── frontend/                     # Frontend React (dossier séparé)
│   └── src/
│       ├── api/                  # Clients HTTP (auth, admin, clients, departments)
│       ├── app/                  # Routeur, layout, guards
│       ├── components/           # Composants réutilisables (UI, form)
│       ├── features/             # Modules métier
│       │   ├── auth/             # Login, logout, password
│       │   ├── admin/users/      # Gestion des utilisateurs
│       │   ├── clients/          # Module clients
│       │   ├── departments/      # Module départements
│       │   ├── errors/           # Pages d'erreur
│       │   ├── home/             # Page d'accueil
│       │   └── profile/          # Changement de mot de passe
│       ├── lib/                  # Utilitaires (format, passwordPolicy, serverErrors)
│       └── styles/               # CSS global (Tailwind)
├── routes/
│   ├── api.php                   # Routes API v1
│   ├── web.php                   # Route catch-all SPA
│   └── console.php
└── tests/                        # Tests PHPUnit
    └── Feature/                  # Tests fonctionnels (Auth, Clients, Departments)
```

**Architecture API :** Laravel sert uniquement l'API REST au préfixe `/api/v1`. Le frontend React est dans un dossier séparé `frontend/` avec son propre `package.json` et un proxy Vite vers le backend (`http://localhost:8004`). L'authentification utilise Sanctum en mode SPA par cookie de session.

### 1.4 Organisation des modules

Le projet est organisé en 7 phases de développement (lots) :

| Phase | Contenu | Statut global |
|-------|---------|---------------|
| Phase 1 | Socle (Auth, Utilisateurs, Départements) | **Terminé** |
| Phase 2 | Référentiels (Clients terminé, reste bloqué) | **Partiellement terminé** |
| Phase 3 | Documents | **Non développé** |
| Phase 4 | Validation | **Non développé** |
| Phase 5 | Archivage | **Non développé** |
| Phase 6 | Pilotage | **Partiellement développé** (journal seul) |
| Phase 7 | Mise en production | **Non développé** |

---

## 2. Liste de tout ce qui a été réalisé

### MODULE : Authentification (Lot 1.1)

#### 2.1 Connexion / Déconnexion

- **Statut : TERMINÉ**
- **Objectif :** Ouvrir/fermer une session Sanctum par cookie.
- **Éléments développés :**
  - `POST /api/v1/auth/login` → `AuthController@login` + `LoginService`
  - `POST /api/v1/auth/logout` → `AuthController@logout` + `AuditLogger`
  - Vérification de session avant traitement (`SESSION_REQUIRED`)
  - Journalisation des connexions réussies et échouées
- **Fichiers :** `AuthController.php`, `LoginService.php`, `LoginRequest.php`, `api.php`, `auth.ts`, `LoginPage.tsx`, `useAuth.ts`

#### 2.2 Verrouillage de compte

- **Statut : TERMINÉ**
- **Objectif :** Verrouiller après 5 échecs (15 minutes).
- **Éléments développés :**
  - `LoginLockoutService` : comptage, verrouillage, déverrouillage, lot de consultation
  - Table `login_lockouts` (migration `2026_11_24_150100`)
  - `MAX_ATTEMPTS = 5`, `LOCK_MINUTES = 15`
  - Hash de l'adresse e-mail en base (pas de donnée en clair)
- **Fichiers :** `LoginLockoutService.php`, migration `150100`, `LoginLockout.php`

#### 2.3 Politique de mot de passe

- **Statut : TERMINÉ**
- **Objectif :** 10-64 caractères, majuscule, minuscule, chiffre ; historique des 3 derniers.
- **Éléments développés :**
  - `StrongPassword` (règle custom)
  - `PasswordService` : génération temporaire, historique, vérification réutilisation
  - Table `password_histories` (migration `2026_11_24_150200`)
  - `Password::defaults()` dans `AppServiceProvider`
- **Fichiers :** `StrongPassword.php`, `PasswordService.php`, migration `150200`, `PasswordHistory.php`

#### 2.4 Changement de mot de passe obligatoire (première connexion)

- **Statut : TERMINÉ**
- **Objectif :** Forcer le changement à la première connexion.
- **Éléments développés :**
  - Colonne `must_change_password` sur `users`
  - Middleware `EnsurePasswordIsChanged` → `PASSWORD_CHANGE_REQUIRED` (403)
  - `PUT /api/v1/auth/password` → `PasswordController@update`
  - Page React `FirstLoginPage.tsx`, guard `RequirePasswordChange`
- **Fichiers :** `EnsurePasswordIsChanged.php`, `PasswordController.php`, `FirstLoginPage.tsx`, `ChangePasswordForm.tsx`

#### 2.5 Réinitialisation par e-mail

- **Statut : TERMINÉ**
- **Objectif :** Envoi d'un lien, usage unique (60 min), fermeture des sessions.
- **Éléments développés :**
  - `POST /api/v1/auth/forgot-password` et `POST /api/v1/auth/reset-password`
  - `PasswordResetController` : réponse identique quelle que soit l'adresse (règle D3)
  - `ResetPasswordNotification` : lien vers le frontend React
  - Pages React `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- **Fichiers :** `PasswordResetController.php`, `ResetPasswordNotification.php`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`

#### 2.6 Vérification de session et compte actif

- **Statut : TERMINÉ**
- **Objectif :** Rejeter les comptes désactivés même avec session ouverte.
- **Éléments développés :**
  - Middleware `EnsureAccountIsActive` : logout + invalidation session + `ACCOUNT_DISABLED` (401)
  - `GET /api/v1/auth/me` pour récupérer le profil courant
- **Fichiers :** `EnsureAccountIsActive.php`, `AuthController@me`

#### 2.7 Journal d'audit (authentification)

- **Statut : TERMINÉ**
- **Objectif :** Tracer toutes les actions de sécurité.
- **Éléments développés :**
  - Table `audit_logs` (append-only) avec `occurred_at`, `event`, `result`, `user_id`, `actor_id`, `email`, `ip`, `user_agent`, `details`
  - `AuditLogger` service injecté dans tous les contrôleurs sensibles
  - Événements : `LoginSucceeded`, `LoginFailed`, `AccountLocked`, `Logout`, `PasswordChanged`, `PasswordResetRequested`, `PasswordResetCompleted`, `PasswordResetFailed`
- **Fichiers :** `AuditLogger.php`, `AuditLog.php`, `AuditEvent.php`, migration `150300`

---

### MODULE : Utilisateurs et rôles (Lot 1.2)

#### 2.8 Liste, recherche et filtres des comptes

- **Statut : TERMINÉ**
- **Objectif :** Consultation paginée avec recherche et filtres.
- **Éléments développés :**
  - `GET /api/v1/admin/users` avec filtres `search`, `role`, `status`
  - Recherche littérale (% et _ échappés), tri par nom, pagination 25
  - Frontend : `UsersPage.tsx`, `UsersTable.tsx`, debounce 300 ms
- **Fichiers :** `UserController@index`, `AdminUserResource.php`, `UsersPage.tsx`, `UsersTable.tsx`

#### 2.9 Création de compte avec mot de passe temporaire

- **Statut : TERMINÉ**
- **Objectif :** Créer un compte avec role, département, mdp temporaire.
- **Éléments développés :**
  - `POST /api/v1/admin/users` → `UserController@store` → `UserAdministrationService@create`
  - Mot de passe temporaire (14 chars, Fisher-Yates) affiché une seule fois
  - `StoreUserRequest` : validation email unique, rôle enum, département actif
  - Frontend : `UserFormDialog.tsx`, `TemporaryPasswordDialog.tsx`
- **Fichiers :** `UserController.php`, `UserAdministrationService.php`, `StoreUserRequest.php`, `UserFormDialog.tsx`

#### 2.10 Modification de compte

- **Statut : TERMINÉ**
- **Objectif :** Modifier nom, email, rôle, département (pas son propre rôle).
- **Éléments développés :**
  - `PATCH /api/v1/admin/users/{user}` → `UserAdministrationService@update`
  - Refus de changer son propre rôle (règle A1)
  - Fermeture des sessions si le rôle change (règle E3)
  - `UpdateUserRequest` avec validation
  - Retrait automatique de responsable de département si rôle/département change (D4)
- **Fichiers :** `UserAdministrationService@update`, `UpdateUserRequest.php`

#### 2.11 Activation / Désactivation de compte

- **Statut : TERMINÉ**
- **Objectif :** Désactiver (fermeture sessions), réactiver.
- **Éléments développés :**
  - `POST /api/v1/admin/users/{user}/deactivate` et `/activate`
  - Refus de se désactiver soi-même
  - Vérification d'au moins un Super Admin actif restant (G2, lockForUpdate)
  - Frontend : `Switch.tsx`, `ConfirmDialog.tsx`
- **Fichiers :** `UserAdministrationService@deactivate/activate`, `SessionInvalidator.php`

#### 2.12 Réinitialisation du mot de passe par l'admin

- **Statut : TERMINÉ**
- **Objectif :** Générer un nouveau mdp temporaire, fermer toutes les sessions.
- **Éléments développés :**
  - `POST /api/v1/admin/users/{user}/reset-password`
  - Levée automatique du verrouillage
  - `TemporaryPasswordDialog.tsx` pour l'affichage unique
- **Fichiers :** `UserAdministrationService@resetPassword`

#### 2.13 Déverrouillage de compte

- **Statut : TERMINÉ**
- **Objectif :** Lever le verrouillage d'une adresse.
- **Éléments développés :**
  - `POST /api/v1/admin/users/{user}/unlock`
  - Indicateur `locked_until` dans `AdminUserResource`
- **Fichiers :** `UserAdministrationService@unlock`, `LoginLockoutService@clear`

#### 2.14 Cartes des rôles avec permissions

- **Statut : TERMINÉ**
- **Objectif :** Afficher les 7 rôles avec leurs permissions réelles.
- **Éléments développés :**
  - `GET /api/v1/admin/roles` → `ReferenceController@roles`
  - Permissions lues en base (celles réellement appliquées), nombre de comptes
  - Frontend : `RoleCards.tsx`
  - Mention « Répartition provisoire »
- **Fichiers :** `ReferenceController.php`, `RoleCards.tsx`

#### 2.15 Commande Artisan de création d'admin

- **Statut : TERMINÉ**
- **Objectif :** Créer le premier Super Admin via console.
- **Éléments développés :**
  - `php artisan ged:create-admin {email} {--name=}`
  - Mot de passe masqué, validation forte, journalisation
- **Fichiers :** `CreateAdminCommand.php`

#### 2.16 Rôles et permissions (système)

- **Statut : TERMINÉ**
- **Objectif :** 7 rôles, 17 permissions, matrice initiale.
- **Éléments développés :**
  - `RoleName` enum avec labels, descriptions, permissions, `hasCabinetWideScope()`
  - `PermissionName` enum avec 17 permissions
  - `RolesAndPermissionsSeeder` (idempotent)
  - `DevelopmentAccountsSeeder` : 7 comptes de test (1 par rôle), `@ged.test`
  - `PostmanTestAccountsSeeder` : comptes Postman `@postman.test`
- **Fichiers :** `RoleName.php`, `PermissionName.php`, `RolesAndPermissionsSeeder.php`, `DevelopmentAccountsSeeder.php`

---

### MODULE : Départements (Lot 1.3)

#### 2.17 Liste des départements

- **Statut : TERMINÉ**
- **Objectif :** Consultation selon le rôle (D1).
- **Éléments développés :**
  - `GET /api/v1/departments` → `DepartmentController@index`
  - `DepartmentPolicy@viewAny` : Super Admin / Directeur / Resp. GED voient tout ; Resp. Département voit le sien ; autres → 403
  - Comptage des membres actifs (`withActiveMembersCount`)
  - Frontend : `DepartmentsPage.tsx`, `DepartmentCards.tsx`
- **Fichiers :** `DepartmentController.php`, `DepartmentPolicy.php`, `DepartmentResource.php`, `DepartmentsPage.tsx`

#### 2.18 Détail d'un département

- **Statut : TERMINÉ**
- **Objectif :** Fiche avec membres (nom, rôle, statut).
- **Éléments développés :**
  - `GET /api/v1/departments/{department}`
  - Chargement membres avec rôles et tri (actifs en premier, puis par nom)
  - Frontend : `DepartmentDetailsDialog.tsx`
- **Fichiers :** `DepartmentController@show/loadDetail`

#### 2.19 Création de département

- **Statut : TERMINÉ**
- **Objectif :** Code (2-20 chars, `[A-Z0-9-]`, unique), nom. Responsable désigné ensuite.
- **Éléments développés :**
  - `POST /api/v1/departments` → `DepartmentService@create`
  - `StoreDepartmentRequest` avec validation code (regex, unique)
  - Colonne `created_by` (auteur)
  - Frontend : `DepartmentFormDialog.tsx`
- **Fichiers :** `DepartmentService.php`, `StoreDepartmentRequest.php`

#### 2.20 Modification d'un département (nom + responsable)

- **Statut : TERMINÉ**
- **Objectif :** Modifier le nom et désigner le responsable (D4).
- **Éléments développés :**
  - `PATCH /api/v1/departments/{department}`
  - Validation du responsable : actif, rôle `resp_dept`, rattaché au département, ne dirige aucun autre (D4, `lockForUpdate`)
  - Journalisation détaillée du changement de responsable
- **Fichiers :** `DepartmentService@update/eligibleManager`

#### 2.21 Désactivation / Réactivation d'un département

- **Statut : TERMINÉ**
- **Objectif :** Refus si comptes actifs rattachés (D6).
- **Éléments développés :**
  - `POST /api/v1/departments/{department}/deactivate` et `/activate`
  - Comptage avec `lockForUpdate` pour éviter les race conditions
  - Retrait automatique du manager si désactivation
  - Frontend : `ConfirmDialog.tsx`
- **Fichiers :** `DepartmentService@deactivate/activate`

#### 2.22 Retrait automatique du responsable (D4)

- **Statut : TERMINÉ**
- **Objectif :** Retirer la désignation si le responsable est désactivé, change de rôle ou de département.
- **Éléments développés :**
  - `DepartmentService@releaseIneligibleManagership`
  - Appelée depuis `UserAdministrationService@update/deactivate`
  - Journalisée (`DepartmentManagerRemoved`)
- **Fichiers :** `DepartmentService@releaseIneligibleManagership`

---

### MODULE : Clients (Lot 2.1)

#### 2.23 Liste paginée des clients

- **Statut : TERMINÉ**
- **Objectif :** Consultation selon périmètre (C3/Q-14 provisoire).
- **Éléments développés :**
  - `GET /api/v1/clients` avec recherche littérale (nom, code, secteur, contact) et filtre département
  - `Client::scopeVisibleTo` : transverses = tout le cabinet ; RespDept/Collabo = leur département ; Stagiaire/Auditeur = rien
  - Départements disponibles fournis dans la réponse
  - Frontend : `ClientsPage.tsx`, `ClientsTable.tsx`
- **Fichiers :** `ClientController@index`, `Client.php@scopeVisibleTo`, `ClientPolicy.php`

#### 2.24 Détail d'un client

- **Statut : TERMINÉ**
- **Objectif :** Fiche complète avec départements associés.
- **Éléments développés :**
  - `GET /api/v1/clients/{client}` avec `ClientPolicy@view`
  - Frontend : `ClientDetailsDialog.tsx`
- **Fichiers :** `ClientController@show`, `ClientResource.php`

#### 2.25 Création d'un client

- **Statut : TERMINÉ**
- **Objectif :** Code généré `CLI-0001`, dénomination obligatoire en majuscules, au moins un département.
- **Éléments développés :**
  - `POST /api/v1/clients` → `ClientService@create`
  - Code provisoire `TMP-XXXXXXXX`, remplacé par `CLI-{id:04d}` dans la transaction
  - `StoreClientRequest` : `code prohibited`, `department_ids` requis, normalisation
  - Rattachement Many-To-Many `client_department`
  - Frontend : `ClientFormDialog.tsx`
- **Fichiers :** `ClientService@create`, `StoreClientRequest.php`, `Client.php`

#### 2.26 Modification d'un client

- **Statut : TERMINÉ**
- **Objectif :** Modifier les champs (sauf code) et les départements de suivi.
- **Éléments développés :**
  - `PATCH /api/v1/clients/{client}` → `ClientService@update`
  - Journalisation des changements champ par champ et des évolutions de rattachement
  - `UpdateClientRequest`
- **Fichiers :** `ClientService@update`, `UpdateClientRequest.php`

---

### MODULE : Journal d'audit — API (Lot 6.1 partiel)

#### 2.27 Consultation du journal (API uniquement)

- **Statut : TERMINÉ (API) / NON DÉVELOPPÉ (interface frontend)**
- **Objectif :** Lister les entrées d'audit filtrées.
- **Éléments développés :**
  - `GET /api/v1/admin/audit-logs` → `AuditLogController@index`
  - Filtres : `event`, `result`, `email`, `from`, `to`
  - Pagination 50, tri antéchronologique
  - `AuditLogResource` avec user/actor enrichis
- **Manque :** Aucune interface React pour ce module.
- **Fichiers :** `AuditLogController.php`, `AuditLogResource.php`

---

### MODULE : Infrastructure & Configuration

#### 2.28 Configuration de sécurité

- **Statut : TERMINÉ**
- **Éléments développés :**
  - Rate limiting nommé par route (`login`, `password-forgot`, `password-reset`, `password-update`)
  - `SESSION_LIFETIME=30` (inactivité)
  - `BCRYPT_ROUNDS=12`
  - Sanctum stateful domains configurés
  - Format d'erreur 404/405 uniformisé
  - Réponse uniforme des refus de Policy (403, `FORBIDDEN`, message français)

#### 2.29 Structure frontend

- **Statut : TERMINÉ**
- **Éléments développés :**
  - Guards React : `RequireAuth`, `GuestOnly`, `RequirePasswordChange`
  - Layout applicatif : `AppLayout`, `Sidebar`, `Topbar`, `UserMenu`
  - Navigation conditionnelle selon les permissions
  - Pages d'erreur : `AccessDeniedPage`, `NotFoundPage`, `RouteErrorPage`
  - Composants réutilisables : `Button`, `Modal`, `ConfirmDialog`, `Pagination`, `Badge`, `Switch`, `Toast`, `FormAlert`, `IconInput`, `PasswordInput`, `PasswordRequirements`, `SelectField`, `FullPageStatus`
  - Chargement à la demande (lazy loading) pour les modules

#### 2.30 Tests backend

- **Statut : TERMINÉ (pour les lots 1.1, 1.2, 1.3, 2.1)**
- **Éléments développés :**
  - `LoginTest`, `FirstLoginTest`, `SessionTest`, `PasswordPolicyTest`, `PasswordResetTest`
  - `AccountAdministrationTest`, `RolesAndAdminCommandTest`
  - `DepartmentManagementTest` (droits D1, D4, D6, D7, retrait automatique)
  - `ClientManagementTest` (13 tests, 126 assertions d'après PLAN_BACKEND.md)
  - `ApiErrorFormatTest`, `HealthTest`
  - Seeders de test : `DevelopmentAccountsSeederTest`, `PostmanTestAccountsSeederTest`
- **Fichiers :** `tests/Feature/`

#### 2.31 Tests frontend

- **Statut : À VÉRIFIER**
- **Éléments présents :**
  - `auth.test.tsx`, `users.test.tsx`, `clients.test.tsx`, `departments.test.tsx`
  - Setup Vitest + Testing Library + jsdom
  - `renderWithRouter.tsx` helper
- **Note :** Présents mais non exécutés pendant cet audit ; statut fonctionnel non confirmé.

---

## 3. Liste de tout ce qui reste à faire

### PRIORITÉ 1 — Corrections critiques

| # | Module | Tâche | Description | Fichiers concernés |
|---|--------|-------|-------------|--------------------|
| P1-01 | Clients | Validation des `department_ids` inexistants | `StoreClientRequest` accepte tout ID entier, mais n'exige pas que le département soit actif (contrairement à `StoreUserRequest` qui vérifie `is_active`). Un client peut être rattaché à un département désactivé. | `StoreClientRequest.php`, `UpdateClientRequest.php` |
| P1-02 | Configuration | `.env.example` utilise SQLite par défaut mais le projet tourne sur MySQL | Le fichier `.env.example` pointe sur SQLite (`DB_CONNECTION=sqlite`), mais le journal des décisions indique que MySQL est en production. Sans `.env` correct, les migrations échoueront. | `.env.example`, `.env` |
| P1-03 | Sécurité | `StoreClientRequest@authorize` retourne toujours `true` | La Gate `create` est vérifiée dans le contrôleur, mais le FormRequest lui-même n'effectue aucun contrôle. Si le middleware de permission venait à être mal configuré, le FormRequest n'opposerait aucune résistance. Risque limité car la route est protégée par `permission:clients.manage`. | `StoreClientRequest.php` |

### PRIORITÉ 2 — Fonctionnalités principales manquantes

#### Lot 2.2 — Arborescence et modèle de dossier client (BLOQUÉ)

| Tâche | Description | Dépendances |
|-------|-------------|-------------|
| Décisions Q-05, Q-06 | Trancher le point de départ du comptage des 4 niveaux et les noms des sous-dossiers 02-06, 99 | Réponses client DC-KNOWING |
| Table `folders` | Structure : parent, chemin, profondeur, nature, marqueurs restreint/lecture-seule | Décisions Q-05, Q-06 |
| Espaces internes | 00_DIRECTION, 02-06, 99_ARCHIVES, racine 01_CLIENTS | Table `folders` |
| Modèle dossier client | `_MODELE_DOSSIER_CLIENT` : A_PERMANENT, B_EXERCICES | Table `folders` |
| Génération automatique | Créer le dossier à la création d'un client | Lot 2.2 |

#### Lot 2.3 — Exercices annuels (BLOQUÉ)

| Tâche | Description | Dépendances |
|-------|-------------|-------------|
| Décisions Q-10 | Année civile ? Qui crée N+1, et quand ? Règle de clôture ? | DC-KNOWING |
| Table `exercises` | Client, année, statut, dates | Lot 2.2 + Q-10 |
| Création d'exercice | Génère sous B_EXERCICES les 7 rubriques | Table `exercises` |
| Clôture d'exercice | Selon MAN-05 et CDC-06 | DC-KNOWING |

#### Lot 2.4 — Droits par périmètre (BLOQUÉ)

| Tâche | Description | Dépendances |
|-------|-------------|-------------|
| Q-11, Q-14 | Confirmer les réglages provisoires | DC-KNOWING |
| Service de périmètre | Calcul dynamique des clients/dossiers visibles | Lots 2.1-2.3 |
| Table `access_grants` | Autorisations exceptionnelles par utilisateur | Service périmètre |
| Policies dossiers/documents | Extension des Policies existantes | Table `access_grants` |

#### Lot 3.1-3.6 — Documents (tout BLOQUÉ)

| Lot | Tâche clé | Dépendances |
|----|-----------|-------------|
| 3.1 | Tables `document_types`, `document_categories`, nommage | Q-07, INC-01, INC-02 |
| 3.2 | Stockage sécurisé, contrôles MIME/extension, quarantaine antivirus | Q-03, Q-04 |
| 3.3 | Tables `documents`, `document_versions`, métadonnées | INC-07 |
| 3.4 | Téléchargement sécurisé, aperçu, en-têtes `nosniff` | Lot 3.2 |
| 3.5 | Explorateur, recherche full-text, filtres, tris | Lots 3.2-3.4 |
| 3.6 | Déplacement, suppression logique, corbeille | Lot 3.5 |

#### Lot 4.1-4.2 — Validation et Notifications (BLOQUÉ)

| Lot | Tâche clé | Dépendances |
|----|-----------|-------------|
| 4.1 | Circuit de validation (Brouillon → En attente → Validé/Rejeté), table `document_decisions` | Q-12, MAN-06 |
| 4.2 | Notifications internes, table `notifications`, marquage lu | Canal notification DC-KNOWING |

#### Lot 5.1-5.2 — Archivage (BLOQUÉ)

| Lot | Tâche clé | Dépendances |
|----|-----------|-------------|
| 5.1 | Table `archive_requests`, propositions/confirmations/réouvertures | Q-16, CDC-05, CDC-06 |
| 5.2 | Radiation de clients (conservation du code), espace 99_ARCHIVES | Q-17, INC-04, INC-06 |

### PRIORITÉ 3 — Fonctionnalités secondaires

| # | Module | Tâche | Description |
|---|--------|-------|-------------|
| P3-01 | Journal d'audit | Interface React `/admin/journal` | La route API existe, il manque l'écran de consultation avec filtres |
| P3-02 | Tableau de bord | Lot 6.2 | Indicateurs selon profil, sans chiffres fictifs |
| P3-03 | Paramètres | Lot 6.3 | Infos cabinet, taille dépôt, formats, archivage, notification |
| P3-04 | Alertes CGA | Lot 6.4 (optionnel) | Échéances 31/01, 30/04, 30/06 — sujet à Q-18 |

### PRIORITÉ 4 — Optimisations, finitions et production

| # | Module | Tâche | Description |
|---|--------|-------|-------------|
| P4-01 | Production | Lot 7.1 | HTTPS, SMTP, antivirus, sauvegardes, files d'attente, performances |
| P4-02 | Frontend | Favicon et pages légales | Favicon, CGU, mentions légales avec textes validés |
| P4-03 | Tests frontend | Exécution et validation | Lancer Vitest, corriger les tests en échec |
| P4-04 | Collection Postman | Mise à jour lots 2.2+ | La collection couvre 1.1-2.1 ; elle devra être mise à jour à chaque lot |
| P4-05 | Validation des permissions | Confirmation par DC-KNOWING | La matrice est provisoire (Q-12, Q-15) |
| P4-06 | Accessibilité | Audit a11y complet | Interface partiellement testée (labels aria présents, navigation clavier à confirmer) |

---

## 4. Liste des anomalies et problèmes détectés

### ÉLEVÉE

#### ANO-01 — `StoreClientRequest` : `department_ids` accepte des départements désactivés

- **Description :** La règle `exists:departments,id` sur `department_ids.*` ne vérifie pas que le département est actif. `StoreUserRequest` pose, elle, la contrainte `->where('is_active', true)`. Un Super Admin pourrait donc rattacher un nouveau client à un département désactivé.
- **Localisation :** [`StoreClientRequest.php`](file:///c:\laragon\www\GED-DC-KNOWING-main\app\Http\Requests\Clients\StoreClientRequest.php) ligne 57, et `UpdateClientRequest.php`
- **Gravité : ÉLEVÉE** — Incohérence de données potentielle.
- **Conséquence :** Un client apparaîtrait dans un département inactif, ce qui peut provoquer des comportements inattendus lors du filtrage et des vérifications de périmètre.

#### ANO-02 — `StoreClientRequest@authorize` retourne `true` sans vérification

- **Description :** Contrairement à `StoreUserRequest` qui vérifie la permission `users.manage`, `StoreClientRequest@authorize()` retourne `true` inconditionnellement, en déléguant le contrôle à la Gate dans le contrôleur. C'est fonctionnellement correct (car le contrôleur appelle `Gate::authorize('create', Client::class)`), mais la cohérence des Form Requests est rompue.
- **Localisation :** [`StoreClientRequest.php`](file:///c:\laragon\www\GED-DC-KNOWING-main\app\Http\Requests\Clients\StoreClientRequest.php) ligne 15
- **Gravité : MOYENNE** — Pas de risque de sécurité actuel, mais fragilité architecturale.

#### ANO-03 — `AuditLogger@log` : `actor_id` utilise `user_id` si `actor` est null

- **Description :** Lorsque `$actor` est null, `actor_id` prend la valeur de `user_id` (l'utilisateur cible). Cela est intentionnel pour les actions en self-service (connexion, changement de mdp), mais pour les actions admin où l'acteur et la cible sont différents, le code suppose que `$actor` est toujours fourni. Si un appel oublie `$actor`, le journal enregistrera l'utilisateur comme son propre acteur.
- **Localisation :** [`AuditLogger.php`](file:///c:\laragon\www\GED-DC-KNOWING-main\app\Services\Security\AuditLogger.php) ligne 35
- **Gravité : MOYENNE** — Impact sur la traçabilité du journal d'audit, pas sur la sécurité.

### MOYENNE

#### ANO-04 — `.env.example` incohérent avec l'environnement MySQL utilisé

- **Description :** `.env.example` configure `DB_CONNECTION=sqlite` mais les décisions (`DECISIONS.md`) indiquent que MySQL est utilisé (`ged-dc-knowing`). Un développeur qui copie `.env.example` obtiendra des migrations SQLite, incompatibles avec certains index ou types utilisés.
- **Localisation :** [`.env.example`](file:///c:\laragon\www\GED-DC-KNOWING-main\.env.example)
- **Gravité : MOYENNE** — Friction à l'onboarding.

#### ANO-05 — `SessionInvalidator` non vérifié dans cet audit

- **Description :** `SessionInvalidator` est appelé dans `UserAdministrationService` et `PasswordController` pour fermer les sessions d'un utilisateur. Son implémentation concrète n'a pas été lue. Si la fermeture de sessions repose sur une suppression en table `sessions`, elle peut échouer silencieusement si la session est stockée dans un driver différent (fichier, Redis).
- **Localisation :** `app/Services/Security/SessionInvalidator.php`
- **Gravité : MOYENNE (À VÉRIFIER)**

#### ANO-06 — `laravel/boost` ne peut pas être installé (conflit de dépendances)

- **Description :** La tentative d'installation de `laravel/boost` a échoué avec `Your requirements could not be resolved`. Ce package est mentionné dans `DECISIONS.md` comme « non installé pour l'instant ». Le point à confirmer : si `AGENTS.md` demande son installation avant chaque session, cet échec bloquera les agents automatisés.
- **Localisation :** `composer.json`, `AGENTS.md`
- **Gravité : FAIBLE** — L'application fonctionne sans ; uniquement une friction outillage.

### FAIBLE

#### ANO-07 — Doublon de fichiers API client (`api/client.ts` et `api/clients.ts`)

- **Description :** Le dossier `frontend/src/api/` contient `client.ts` (instance Axios + helpers) ET `clients.ts` (module clients). La coexistence peut induire une confusion de nommage.
- **Localisation :** [`frontend/src/api/`](file:///c:\laragon\www\GED-DC-KNOWING-main\frontend\src\api)
- **Gravité : FAIBLE** — Pas de bug, uniquement risque de confusion.

#### ANO-08 — `HomePage` vide (pas de données réelles)

- **Description :** La page d'accueil affiche uniquement le nom, le rôle et le département de l'utilisateur connecté, avec le message « Les modules documentaires apparaîtront… ». Pas de tableau de bord ni d'indicateurs, ce qui est volontaire (lot 6.2 non développé), mais l'UX est minimaliste.
- **Localisation :** [`frontend/src/features/home/HomePage.tsx`](file:///c:\laragon\www\GED-DC-KNOWING-main\frontend\src\features\home\HomePage.tsx)
- **Gravité : FAIBLE** — Attendu à ce stade.

---

## 5. État de la base de données

### 5.1 Tables existantes (migrations exécutées)

| Table | Migration | Contenu | État |
|-------|-----------|---------|------|
| `users` | `0001_01_01_000000` + `140000` + `150000` | id, name, email, email_verified_at, password, must_change_password, password_changed_at, is_active, last_login_at, created_by, department_id, remember_token, timestamps | ✅ Cohérente avec le modèle |
| `password_reset_tokens` | `0001_01_01_000000` | email (PK), token, created_at | ✅ Standard Laravel |
| `sessions` | `0001_01_01_000000` | id, user_id, ip_address, user_agent, payload, last_activity | ✅ Driver database |
| `cache` | `0001_01_01_000001` | key, value, expiration | ✅ Standard |
| `jobs` / `job_batches` / `failed_jobs` | `0001_01_01_000002` | Files d'attente | ✅ Standard |
| `personal_access_tokens` | `2026_11_23_160232` | Tokens Sanctum API | ✅ Sanctum |
| `roles` / `permissions` / pivots Spatie | `2026_11_24_132059` | Spatie permission tables | ✅ Spatie |
| `departments` | `2026_11_24_140000` + `2026_11_25_100000` | id, code (unique), name, is_active, manager_id (unique FK), created_by (FK), timestamps | ✅ Cohérente avec le modèle |
| `login_lockouts` | `2026_11_24_150100` | email_hash (PK), failed_attempts, locked_until, timestamps | ✅ Cohérente |
| `password_histories` | `2026_11_24_150200` | id, user_id (FK), password, timestamps | ✅ Cohérente |
| `audit_logs` | `2026_11_24_150300` | id, occurred_at, event, result, user_id (FK), actor_id (FK), email, ip, user_agent, details (JSON) | ✅ Append-only par convention |
| `clients` | `2026_11_25_120000` | id, code (unique), name, legal_form, sector, tax_regime, rccm, dfe, address, phone, email, contact_name, started_on, is_active, radiated_at, created_by (FK), timestamps | ✅ Cohérente |
| `client_department` | `2026_11_25_120000` | id, client_id (FK+cascade), department_id (FK+cascade), timestamps, unique(client_id, department_id) | ✅ Cohérente |

### 5.2 Relations entre tables

```
users ──(department_id)──→ departments
users ──(created_by)──→ users
users ──(manager_id dans departments)──→ departments [unique constraint]
departments ──(created_by)──→ users
clients ──(created_by)──→ users
clients ←─(BelongsToMany)──→ departments [via client_department]
audit_logs ──(user_id)──→ users
audit_logs ──(actor_id)──→ users
password_histories ──(user_id)──→ users
login_lockouts [standalone, clé = hash email]
```

### 5.3 Tables manquantes (lots futurs)

| Table | Lot | Statut |
|-------|-----|--------|
| `folders` | 2.2 | Non créée |
| `exercises` | 2.3 | Non créée |
| `access_grants` | 2.4 | Non créée |
| `document_types` | 3.1 | Non créée |
| `document_categories` | 3.1 | Non créée |
| `documents` | 3.3 | Non créée |
| `document_versions` | 3.3 | Non créée |
| `document_decisions` | 4.1 | Non créée |
| `notifications` | 4.2 | Non créée |
| `archive_requests` | 5.1 | Non créée |

### 5.4 Incohérences détectées

- **ANO-01 (reprise) :** `StoreClientRequest` n'exige pas `departments.is_active = true` sur les `department_ids`. La contrainte de clé étrangère existe, mais la contrainte métier n'est pas appliquée.
- **`audit_logs` sans contrainte d'immutabilité en base :** L'audit est append-only par convention applicative, mais rien en base n'empêche un `UPDATE` direct. C'est une limitation acceptable en v1 (mentions dans le code).

---

## 6. État technique général

### 6.1 Points forts

| Aspect | Observation |
|--------|-------------|
| **Architecture en couches** | Séparation claire : Controllers → Services → Models. Les contrôleurs sont minces et délèguent la logique métier aux Services. |
| **Sécurité de l'authentification** | Implémentation solide : dummy hash anti-timing, verrouillage par email avec `lockForUpdate`, fermeture de sessions, réinitialisation clé à usage unique. |
| **Journalisation d'audit** | Systématique sur toutes les actions sensibles. Enum `AuditEvent` évite les chaînes magiques. Pas de mot de passe dans les `details`. |
| **Gestion des droits** | Double vérification : permission Spatie sur les routes + Policy sur chaque action. Conformité au principe de défense en profondeur. |
| **Validations** | Form Requests dédiées par action, messages d'erreur en français, normalisation (lowercase email, uppercase name client). |
| **TypeScript strict** | Frontend en TypeScript avec typage des ressources API (`CurrentUser`, `AdminUser`, `Client`, `Department`). |
| **Code propre** | Enums, PHPDoc, commentaires de règles métier (ex: "règle D4", "règle B4"), nommage explicite. |
| **Tests** | Couverture backend significative pour les 4 lots livrés (Auth, Utilisateurs, Départements, Clients). |
| **Lazy loading frontend** | Modules chargés à la demande (`lazy: () => import(...)`) pour optimiser le temps de chargement initial. |
| **Rate limiting granulaire** | Un limiteur par route pour éviter les interférences entre connexion et réinitialisation. |
| **Race conditions** | `lockForUpdate` sur les vérifications critiques (désactivation Super Admin unique, verrouillage, responsable de département). |

### 6.2 Faiblesses et risques

| Aspect | Observation | Risque |
|--------|-------------|--------|
| **Avancement global faible** | Phases 3-7 non développées. L'application est un socle complet mais sans la fonctionnalité métier principale (gestion documentaire). | Élevé |
| **Nombreuses questions bloquantes non résolues** | 19+ questions (Q-03 à Q-19, INC-01 à INC-07) bloquent les phases 2.2 à 7. | Élevé |
| **Pas de stockage fichiers** | Aucune infrastructure de stockage sécurisé, ni antivirus, ni gestion MIME. | Élevé (lot 3.2) |
| **Périmètre documentaire totalement absent** | Pas de modèle de dossier, pas de documents, pas de versions, pas de validation. | Élevé |
| **Matrix des permissions provisoire** | La matrice a été reprise de la maquette v1.1 mais n'a pas été validée par DC-KNOWING (Q-12, Q-15). | Moyen |
| **Configuration e-mail** | `MAIL_MAILER=log` en développement. Aucune configuration SMTP validée pour la production. | Moyen |
| **Interface du journal d'audit** | L'API existe mais aucune page React ne la consomme. | Faible |
| **Page d'accueil vide** | HomePage minimaliste, sans tableau de bord. | Faible |
| **laravel/boost non installé** | AGENTS.md demande son installation mais elle échoue. | Faible (outillage) |

### 6.3 Évaluation de la qualité du code

- **Cohérence backend/frontend :** Excellente. Les types TypeScript reflètent exactement les API Resources Laravel.
- **Conventions de nommage :** Cohérentes (français dans les messages, anglais dans le code).
- **Duplication :** Aucune duplication notable identifiée.
- **Dépendances :** Toutes stables. `maatwebsite/excel` et `barryvdh/laravel-dompdf` sont présentes mais pas encore utilisées (prévues pour les exports documentaires).

---

## 7. Tableau récapitulatif de l'avancement

| Module | Fonctionnalités prévues/identifiées | Terminées | Partiellement terminées | Non développées | Anomalies |
|--------|-------------------------------------|-----------|------------------------|-----------------|-----------|
| Authentification (Lot 1.1) | 7 | 7 | 0 | 0 | 1 (ANO-03) |
| Utilisateurs & rôles (Lot 1.2) | 9 | 9 | 0 | 0 | 0 |
| Départements (Lot 1.3) | 6 | 6 | 0 | 0 | 0 |
| Clients (Lot 2.1) | 4 | 4 | 0 | 0 | 1 (ANO-01) |
| Arborescence dossiers (Lot 2.2) | 5 | 0 | 0 | 5 | 0 |
| Exercices annuels (Lot 2.3) | 3 | 0 | 0 | 3 | 0 |
| Droits par périmètre (Lot 2.4) | 4 | 0 | 0 | 4 | 0 |
| Référentiels documentaires (Lot 3.1) | 3 | 0 | 0 | 3 | 0 |
| Stockage sécurisé (Lot 3.2) | 5 | 0 | 0 | 5 | 0 |
| Versions & métadonnées (Lot 3.3) | 3 | 0 | 0 | 3 | 0 |
| Consultation/téléchargement (Lot 3.4) | 3 | 0 | 0 | 3 | 0 |
| Explorateur & recherche (Lot 3.5) | 5 | 0 | 0 | 5 | 0 |
| Déplacement & corbeille (Lot 3.6) | 3 | 0 | 0 | 3 | 0 |
| Circuit de validation (Lot 4.1) | 5 | 0 | 0 | 5 | 0 |
| Notifications internes (Lot 4.2) | 3 | 0 | 0 | 3 | 0 |
| Archivage exercices (Lot 5.1) | 3 | 0 | 0 | 3 | 0 |
| Radiation clients (Lot 5.2) | 2 | 0 | 0 | 2 | 0 |
| Journal (consultation, Lot 6.1) | 2 | 1 | 1 | 0 | 0 |
| Tableau de bord (Lot 6.2) | 4 | 0 | 0 | 4 | 0 |
| Paramètres (Lot 6.3) | 3 | 0 | 0 | 3 | 0 |
| Alertes CGA (Lot 6.4) | 1 | 0 | 0 | 1 | 0 |
| Mise en production (Lot 7.1) | 6 | 0 | 0 | 6 | 0 |
| Infrastructure & config | 5 | 5 | 0 | 0 | 2 (ANO-04, ANO-06) |
| **TOTAL** | **106** | **32** | **1** | **73** | **4 confirmées** |

### Estimation globale de l'avancement

**Méthode :** Nombre de fonctionnalités entièrement terminées sur le total identifié.

$$\text{Avancement} = \frac{32 + 0.5 \times 1}{106} \approx \mathbf{30\%}$$

> [!IMPORTANT]
> Cette estimation est **fondée sur le nombre de fonctionnalités** identifiées à partir du PLAN_BACKEND.md et du code. Elle ne reflète pas la complexité relative : les phases 3-7 (documents, validation, archivage) représentent la quasi-totalité de la valeur métier de l'application. En termes de **valeur fonctionnelle livrée pour l'utilisateur final**, l'avancement se situe entre **15 et 20 %** car le socle (phases 1-2.1) est complet mais les fonctionnalités documentaires sont absentes.

---

## 8. Plan d'action recommandé

### Étape 1 — Corrections immédiates (1-2 jours)

1. **ANO-01 :** Ajouter `->where('is_active', true)` dans `StoreClientRequest` et `UpdateClientRequest` sur la règle `department_ids.*`.
2. **ANO-04 :** Mettre à jour `.env.example` pour refléter la configuration MySQL réelle, avec les variables documentées.
3. **ANO-02 :** Ajouter la vérification de permission dans `StoreClientRequest@authorize` pour cohérence.
4. **Vérifier `SessionInvalidator` :** S'assurer que la fermeture des sessions fonctionne avec le driver `database`.

### Étape 2 — Résoudre les questions bloquantes (réunion avec DC-KNOWING)

Avant de commencer le lot 2.2, obtenir les réponses à :
- **Q-05, Q-06 :** Arborescence (niveaux, noms des dossiers)
- **Q-10 :** Exercices (année civile, création N+1, clôture)
- **Q-03, Q-04 :** Infrastructure (hébergement, antivirus, taille fichiers)
- **Q-07 :** Types et catégories documentaires
- **Q-12, Q-15 :** Validation (qui valide, circuit variable, droits définitifs)
- **Q-19 :** Paramètres du cabinet

### Étape 3 — Lot 2.2 : Arborescence et modèle de dossier (5-8 jours)

Après Q-05 et Q-06 résolus :
1. Créer la migration `folders` avec tous les champs
2. Implémenter les espaces internes et le modèle `_MODELE_DOSSIER_CLIENT`
3. Générer automatiquement le dossier lors de la création d'un client
4. Tests PHPUnit + Postman

### Étape 4 — Lot 2.3 : Exercices annuels (4-6 jours)

Après Q-10 résolu et lot 2.2 validé :
1. Migration `exercises`
2. CRUD exercices avec création des 7 rubriques sous B_EXERCICES
3. Règle de clôture
4. Tests + Postman

### Étape 5 — Lot 2.4 : Droits par périmètre (5-7 jours)

Après lots 2.1-2.3 validés et Q-11, Q-14 confirmés :
1. Service de périmètre
2. Table `access_grants` + API
3. Extension des Policies
4. Tests + Postman

### Étape 6 — Lot 3.1 : Référentiels documentaires (3-5 jours)

Après Q-07 résolu :
1. Tables `document_types`, `document_categories`
2. Paramètres de nommage
3. Interface React

### Étape 7 — Lots 3.2-3.3 : Stockage et versioning (8-12 jours)

Après Q-03, Q-04 résolus :
1. Stockage fichiers privés
2. Contrôles MIME/extension
3. File d'attente antivirus (quarantaine)
4. Tables `documents`, `document_versions`
5. Tests de sécurité

### Étape 8 — Lots 3.4-3.6 : Consultation, explorateur, corbeille (8-10 jours)

Après lot 3.3 validé :
1. Téléchargement sécurisé
2. Explorateur (arborescence, recherche, filtres)
3. Déplacement et corbeille

### Étape 9 — Lot 4.1-4.2 : Validation et notifications (6-8 jours)

Après Q-12 et lot 3.3 validés :
1. Circuit de validation complet
2. Notifications internes

### Étape 10 — Lots 5.1-5.2 : Archivage et radiation (5-7 jours)

Après Q-16, Q-17, lots 3-4 validés :
1. Archivage des exercices
2. Radiation des clients
3. Espace 99_ARCHIVES

### Étape 11 — Lots 6.1-6.3 : Pilotage (5-7 jours)

1. Interface React du journal d'audit (API déjà prête)
2. Tableau de bord avec données réelles
3. Paramètres du cabinet

### Étape 12 — Lot 7.1 : Mise en production (3-5 jours)

1. HTTPS, SMTP, antivirus
2. Sauvegardes et restauration
3. Superviseur de files d'attente
4. Performance et tests de charge
5. Favicon, pages légales, pages d'erreur

---

## 9. Conclusion générale

Le projet **GED DC-KNOWING** dispose d'un **socle technique de très bonne qualité** couvrant les phases 1 et 2.1 (authentification, utilisateurs, rôles, départements, clients). La conception est rigoureuse : séparation des responsabilités, sécurité défensive (double vérification des droits, journalisation systématique, protection contre les race conditions, politique de mot de passe forte), et code lisible avec de bons commentaires de règles métier.

Cependant, **l'application est loin d'être exploitable** dans son objectif final de GED. Les phases 3 à 7, qui représentent l'essentiel de la valeur fonctionnelle (gestion des fichiers, explorateur documentaire, circuit de validation, archivage, tableau de bord), sont entièrement absentes et bloquées par de nombreuses questions non résolues avec le client DC-KNOWING.

**Principaux points de vigilance :**

1. **Les décisions bloquantes doivent être obtenues en priorité absolue** (Q-03 à Q-19). Sans elles, le développement des phases 3+ ne peut pas démarrer.
2. **L'anomalie ANO-01** (départements désactivés acceptés sur les clients) doit être corrigée rapidement.
3. **La matrice des permissions est provisoire** : elle doit être validée par DC-KNOWING avant tout déploiement en production.
4. **L'infrastructure de production** (hébergement sécurisé, SMTP, antivirus) n'est pas définie : ces décisions conditioning les lots 3.2 et 7.1.

> [!TIP]
> La prochaine session de développement devrait commencer par la correction ANO-01, puis par une réunion de cadrage avec DC-KNOWING pour débloquer les questions Q-05, Q-06, Q-07, Q-10, Q-03/Q-04 dans cet ordre de priorité.

---

*Audit réalisé le 27/11/2026 — Exploration complète de l'architecture, des routes, des modèles, des services, des migrations, des tests et de la documentation disponible dans le dépôt.*
