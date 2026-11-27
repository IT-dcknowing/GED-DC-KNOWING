# Authentification : conception détaillée (étape 2)

Statut : à valider avant implémentation.
Référence : demande « Développement de la fonctionnalité d'authentification » du 24/11/2026 et analyse technique (étape 1).

## 0. Décisions prises pour cette conception

| Sujet | Décision |
|-------|----------|
| Mécanisme | Sanctum en mode SPA : session serveur stockée dans MySQL, cookie `HttpOnly`, protection CSRF |
| Hachage | bcrypt, 12 tours. Longueur maximale du mot de passe : 64 caractères et 72 octets (bcrypt ignore la suite) |
| Administrateur technique | Rôle Super Administrateur |
| Mot de passe temporaire | Généré par le serveur, affiché une seule fois à l'administrateur, jamais journalisé ni envoyé |
| Réinitialisation par l'administrateur | Nouveau mot de passe temporaire, à changer à la connexion suivante |
| Historique | Interdiction de réutiliser le mot de passe actuel et les 2 précédents |
| Journal d'audit | Table dédiée `audit_logs`, en ajout seul |
| Écrans d'administration des comptes | API complète et testée maintenant ; écrans livrés avec le module « Utilisateurs et rôles » |
| « Se souvenir de moi » | Supprimé (incompatible avec l'expiration après 30 minutes d'inactivité) |
| Page de connexion | Reproduction fidèle de la maquette, avec les écarts justifiés listés en section 7 |
| « Association à un membre » | **Non définie.** En attendant, seule l'association à un département existe. À préciser |

## 1. Les 35 règles

| N° | Règle |
|----|-------|
| A1 | Connexion par adresse e-mail et mot de passe |
| A2 | Identifiants vérifiés par le serveur |
| A3 | Erreurs de connexion gérées et affichées |
| A4 | Message identique si l'e-mail est inconnu ou si le mot de passe est faux |
| A5 | Verrouillage pendant 15 minutes après 5 échecs consécutifs |
| A6 | Compteur remis à zéro après une connexion réussie |
| A7 | Redirection vers l'espace approprié une fois les autorisations chargées |
| B1 | Comptes créés uniquement par le Super Administrateur |
| B2 | Mot de passe temporaire généré automatiquement |
| B3 | Changement obligatoire à la première connexion |
| B4 | Aucune autre fonctionnalité accessible avant ce changement |
| C1 | 10 caractères minimum |
| C2 | Au moins une majuscule, une minuscule et un chiffre |
| C3 | Stockage haché (bcrypt) |
| C4 | Interdiction de réutiliser les 3 derniers mots de passe (l'actuel et les 2 précédents) |
| C5 | Modification depuis le profil avec vérification du mot de passe actuel |
| C6 | Autres sessions fermées après une modification |
| D1 | Formulaire de demande de réinitialisation |
| D2 | Envoi d'un lien à l'adresse e-mail |
| D3 | Même réponse que l'adresse existe ou non |
| D4 | Lien utilisable une seule fois |
| D5 | Lien expiré après une heure |
| D6 | Toutes les sessions fermées après une réinitialisation |
| E1 | Session expirée après 30 minutes d'inactivité |
| E2 | Déconnexion effective côté serveur |
| E3 | Sessions fermées après désactivation du compte ou changement de rôle |
| E4 | Autorisations vérifiées à chaque requête |
| F1 | Journal : connexions réussies et échouées |
| F2 | Journal : verrouillages |
| F3 | Journal : réinitialisations de mot de passe |
| F4 | Journal : modifications de mot de passe |
| F5 | Journal : déconnexions |
| G1 | Impossible de désactiver son propre compte |
| G2 | Toujours au moins un Super Administrateur actif |
| H1 | Aucune inscription publique |

## 2. Base de données

### 2.1 `users` (table existante, colonnes ajoutées)

| Colonne | Type | Rôle |
|---------|------|------|
| `must_change_password` | booléen, défaut `false` | Changement obligatoire au prochain accès (B3, B4) |
| `password_changed_at` | horodatage, nullable | Date du dernier changement |
| `created_by` | référence `users.id`, nullable | Administrateur qui a créé le compte (B1) |

Colonnes déjà présentes et réutilisées : `email` (unique), `password` (haché), `department_id`, `is_active`, `last_login_at`.

### 2.2 `login_lockouts` (nouvelle)

Compteur d'échecs par **adresse e-mail**, que le compte existe ou non. Un seul mécanisme pour tous les cas, donc une réponse identique (A4, A5).

| Colonne | Type | Rôle |
|---------|------|------|
| `email_hash` | SHA-256 de l'e-mail en minuscules, clé primaire | Évite de stocker en clair des adresses mal saisies |
| `failed_attempts` | entier | Échecs consécutifs |
| `locked_until` | horodatage, nullable | Fin du verrouillage |
| `updated_at` | horodatage | Dernier échec |

Fonctionnement :
- chaque échec ajoute 1 ;
- au 5e échec, `locked_until` est fixé à maintenant + 15 minutes et un événement de verrouillage est journalisé ;
- pendant le verrouillage, toute tentative est refusée **sans être vérifiée ni comptée**, même avec le bon mot de passe ;
- une connexion réussie, une réinitialisation réussie ou un déverrouillage par l'administrateur suppriment la ligne ;
- à la fin du verrouillage, le compteur repart à zéro.

### 2.3 `password_histories` (nouvelle)

| Colonne | Type |
|---------|------|
| `id` | identifiant |
| `user_id` | référence `users.id`, suppression en cascade |
| `password` | empreinte bcrypt |
| `created_at` | horodatage |

Une ligne est ajoutée à **chaque** nouveau mot de passe : temporaire, changé ou réinitialisé. Le contrôle C4 compare le nouveau mot de passe aux **3 lignes les plus récentes**, c'est-à-dire l'actuel et les 2 précédents.

### 2.4 `audit_logs` (nouvelle, en ajout seul)

| Colonne | Type | Rôle |
|---------|------|------|
| `id` | identifiant | |
| `occurred_at` | horodatage à la milliseconde, indexé | Date et heure |
| `event` | texte, indexé | Code de l'événement (2.5) |
| `result` | `success` ou `failure` | |
| `user_id` | référence `users.id`, nullable | Compte concerné |
| `actor_id` | référence `users.id`, nullable | Auteur de l'action (l'administrateur, ou l'utilisateur lui-même) |
| `email` | texte, nullable, indexé | Adresse concernée ou saisie |
| `ip` | texte (45), nullable | Adresse IP d'origine |
| `user_agent` | texte (255), nullable | Navigateur |
| `details` | JSON, nullable | Précisions : motif d'échec, ancien et nouveau rôle… |

Garanties :
- le modèle Laravel refuse toute modification et toute suppression ;
- aucune route d'API ne permet de modifier ou de supprimer une entrée ;
- **aucun mot de passe, temporaire ou non, et aucun jeton n'est jamais écrit dans le journal.**

### 2.5 Événements journalisés

| Code | Règle | Contenu |
|------|-------|---------|
| `auth.login.succeeded` | F1 | e-mail, IP |
| `auth.login.failed` | F1 | e-mail saisi, IP, motif : `invalid_credentials`, `account_locked` ou `account_inactive` |
| `auth.account.locked` | F2 | e-mail, IP, fin du verrouillage |
| `auth.logout` | F5 | e-mail, IP |
| `auth.password.changed` | F4 | e-mail, IP, indique s'il s'agissait d'une première connexion |
| `auth.password.reset.requested` | F3 | e-mail saisi, IP, compte trouvé ou non (visible uniquement dans le journal) |
| `auth.password.reset.completed` | F3 | e-mail, IP |
| `auth.password.reset.failed` | F3 | e-mail saisi, IP (lien invalide ou expiré) |
| `admin.user.created` | B1 | administrateur, compte créé, rôle |
| `admin.user.updated` | E3 | administrateur, champs modifiés, ancien et nouveau rôle |
| `admin.user.deactivated` / `admin.user.activated` | E3 | administrateur, compte |
| `admin.user.password_reset` | F3 | administrateur, compte |
| `admin.user.unlocked` | F2 | administrateur, compte |

### 2.6 Relations

- `users` 1 → n `password_histories`
- `users` 1 → n `audit_logs` (comme compte concerné, et comme auteur)
- `users` n → 1 `departments` (existant)
- `users` 1 → n `users` via `created_by`
- `users` n → n `roles` (spatie, un seul rôle par compte imposé par l'application)
- `users` 1 → n `sessions` (existant, par `user_id`)

## 3. Règles de sécurité transverses

### 3.1 Politique de mot de passe (C1, C2, C4)

- Entre 10 et 64 caractères, 72 octets au maximum.
- Au moins une majuscule, une minuscule et un chiffre.
- Différent du mot de passe actuel et des 2 précédents.
- Confirmation identique.

Le contrôle est fait par une seule règle de validation Laravel, utilisée partout. Le frontend affiche les mêmes exigences en direct, mais seul le serveur décide.

### 3.2 Mot de passe temporaire (B2)

- 14 caractères tirés au hasard (générateur cryptographique), avec au moins une majuscule, une minuscule et un chiffre, sans caractères ambigus (`0/O`, `1/l/I`).
- Renvoyé une seule fois dans la réponse de l'API, jamais stocké en clair ni journalisé.
- Le compte reçoit `must_change_password = true`.

### 3.3 Sessions (E1 à E4)

- **Durée** : `SESSION_LIFETIME=30` minutes. Elle repart de zéro à chaque requête, ce qui donne une expiration après 30 minutes d'inactivité.
- **Déconnexion** : la session est supprimée côté serveur et le jeton CSRF est renouvelé.
- **Fermeture de toutes les sessions d'un utilisateur** : suppression des lignes de `sessions` portant son identifiant. Pour un changement volontaire de mot de passe, la session en cours est conservée. En complément, le middleware `AuthenticateSession` de Sanctum déconnecte toute session dont le mot de passe a changé.
- **À chaque requête protégée** (E4), dans cet ordre :
  1. `auth:sanctum` : une session valide est exigée, sinon réponse 401 ;
  2. `account.active` : le compte est relu en base ; s'il est désactivé, la session est fermée et la réponse est 401 avec le code `ACCOUNT_DISABLED` ;
  3. `password.changed` : si `must_change_password` vaut vrai, réponse 403 avec le code `PASSWORD_CHANGE_REQUIRED`. Seules `me`, `logout` et `PUT /auth/password` restent accessibles ;
  4. `permission:…` : permission spatie requise par la route, sinon 403.

### 3.4 Limitation des requêtes

| Route | Limite |
|-------|--------|
| `POST /auth/login` | Verrouillage par e-mail (2.2) et 20 requêtes par minute par IP |
| `POST /auth/forgot-password` | 5 par minute par IP ; Laravel impose aussi 60 secondes entre deux liens pour un même compte |
| `POST /auth/reset-password` | 10 par minute par IP |
| `PUT /auth/password` | 5 par minute par utilisateur |

Les limites par IP renvoient une réponse 429 qui ne révèle rien sur l'existence d'une adresse.

### 3.5 Protection du Super Administrateur (G1, G2)

- Un administrateur ne peut pas désactiver son propre compte.
- Toute désactivation ou tout changement de rôle qui laisserait **zéro** Super Administrateur actif est refusé.
- Le contrôle est fait dans une transaction avec verrouillage des lignes, pour que deux administrateurs agissant en même temps ne puissent pas tous deux réussir.

## 4. API

Toutes les routes sont préfixées par `/api/v1`. Les réponses sont en JSON et les erreurs ont la forme `{ "message": "...", "code": "...", "errors": {...} }`.

### 4.1 Utilisateur

| Méthode et route | Accès | Entrée | Réponse | Règles |
|------------------|-------|--------|---------|--------|
| `GET /sanctum/csrf-cookie` | public | | 204 et cookie `XSRF-TOKEN` | |
| `POST /auth/login` | public | `email`, `password` | 200 avec l'utilisateur, son rôle, ses permissions et `must_change_password` ; 422 avec le message générique ; 422 « compte temporairement verrouillé, réessayez dans N minutes » | A1 à A7, F1, F2 |
| `POST /auth/logout` | connecté | | 204 | E2, F5 |
| `GET /auth/me` | connecté | | 200 avec l'utilisateur ; 401 sinon | A7, E1 |
| `PUT /auth/password` | connecté, même si le changement est obligatoire | `current_password`, `password`, `password_confirmation` | 200 ; 422 si le mot de passe actuel est faux ou si la règle n'est pas respectée | B3, C1 à C6, F4 |
| `POST /auth/forgot-password` | public | `email` | **toujours** 200 avec le même message | D1 à D3, F3 |
| `POST /auth/reset-password` | public | `token`, `email`, `password`, `password_confirmation` | 200 ; 422 « lien invalide ou expiré » | D4 à D6, C1 à C4, F3 |

Messages fixés :
- Identifiants refusés : « Adresse e-mail ou mot de passe incorrect. »
- Demande de réinitialisation : « Si un compte actif correspond à cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé. Ce lien est valable une heure. »

Après une réinitialisation, l'utilisateur n'est pas connecté automatiquement : il se reconnecte avec son nouveau mot de passe.

### 4.2 Administration (permission `users.manage`, Super Administrateur)

| Méthode et route | Entrée | Réponse | Règles |
|------------------|--------|---------|--------|
| `GET /admin/users` | filtres `search`, `role`, `status`, `page` | Liste paginée : identité, rôle, département, actif, verrouillé, mot de passe à changer, dernière connexion | |
| `POST /admin/users` | `name`, `email`, `role`, `department_id` | 201 avec le compte et `temporary_password`, **une seule fois** | B1, B2 |
| `PATCH /admin/users/{id}` | `name`, `email`, `role`, `department_id` (facultatifs) | 200 ; si le rôle change, toutes les sessions du compte sont fermées | E3, G2 |
| `POST /admin/users/{id}/deactivate` | | 200 ; sessions fermées | E3, G1, G2 |
| `POST /admin/users/{id}/activate` | | 200 | |
| `POST /admin/users/{id}/reset-password` | | 200 avec un nouveau `temporary_password` ; sessions fermées ; verrouillage levé | B2, B3 |
| `POST /admin/users/{id}/unlock` | | 200 | F2 |
| `GET /admin/roles` | | Les 7 rôles avec leurs libellés | |
| `GET /admin/departments` | | Départements actifs | |
| `GET /admin/audit-logs` (permission `journal.view`) | filtres `event`, `email`, `result`, `from`, `to`, `page` | Liste paginée, de la plus récente à la plus ancienne | F1 à F5 |

Aucune route d'inscription n'existe (H1). Aucune suppression de compte n'est prévue : on désactive.

## 5. Parcours

### 5.1 Connexion (AUTH-01)

1. React demande le cookie CSRF, puis envoie l'e-mail et le mot de passe.
2. Le serveur vérifie le verrouillage. Si l'adresse est verrouillée : refus et journal `auth.login.failed` (motif `account_locked`).
3. Le serveur vérifie les identifiants. En cas d'échec, il incrémente le compteur, journalise `auth.login.failed`, et au 5e échec il verrouille et journalise `auth.account.locked`. Il renvoie le message générique.
4. Si le compte est inactif : refus avec le message « compte désactivé ». Ce message n'apparaît qu'après un mot de passe correct, donc il ne permet pas de deviner les adresses.
5. En cas de succès : le compteur est supprimé, la session régénérée, `last_login_at` mis à jour, l'événement `auth.login.succeeded` journalisé, et le profil complet renvoyé.
6. React redirige :
   - vers `/premiere-connexion` si le mot de passe est à changer ;
   - sinon vers la page demandée avant la connexion ;
   - sinon vers l'accueil du rôle (l'accueil commun pour l'instant, le tableau de bord plus tard).

### 5.2 Première connexion

1. L'administrateur crée le compte et lit le mot de passe temporaire à l'écran.
2. Il le transmet à la personne par un moyen sûr.
3. La personne se connecte et arrive sur « Choisissez votre mot de passe ».
4. Elle saisit le mot de passe temporaire puis le nouveau, deux fois.
5. Toute autre page ou appel d'API est refusé avec le code `PASSWORD_CHANGE_REQUIRED` (B4).
6. Une fois le mot de passe changé : `must_change_password = false`, ligne d'historique ajoutée, journal, puis accès à l'application.

### 5.3 Mot de passe oublié (AUTH-02, AUTH-03)

1. La personne saisit son adresse. La réponse et le message sont toujours les mêmes.
2. Si un compte actif correspond, Laravel crée un jeton, valable 60 minutes et à usage unique, et envoie un e-mail en français. Le lien pointe vers `FRONTEND_URL/reinitialisation?token=…&email=…`.
3. Sur la page de réinitialisation, la personne choisit un nouveau mot de passe, avec les exigences affichées en direct.
4. En cas de succès :
   - le mot de passe est changé et une ligne d'historique ajoutée ;
   - le jeton est supprimé (usage unique) ;
   - **toutes** les sessions du compte sont fermées et le verrouillage est levé ;
   - l'opération est journalisée ;
   - la personne est envoyée vers la connexion avec un message de confirmation.
5. Un lien déjà utilisé, expiré ou modifié affiche « Ce lien est invalide ou a expiré » et propose de faire une nouvelle demande.

En développement, l'e-mail est écrit dans `storage/logs/laravel.log` (`MAIL_MAILER=log`). **Un serveur SMTP et une adresse d'expéditeur réelle sont nécessaires avant la mise en production.**

### 5.4 Modification depuis le profil (AUTH-05)

1. La personne saisit son mot de passe actuel, puis le nouveau deux fois.
2. Le serveur vérifie le mot de passe actuel, la politique et l'historique.
3. En cas de succès : les autres sessions sont fermées, la session en cours est conservée et l'opération est journalisée.

### 5.5 Expiration et accès refusé (E1, AUTH-04)

- **Réponse 401** sur une page déjà chargée : React efface les données en mémoire et renvoie vers `/connexion` avec le message « Votre session a expiré. Reconnectez-vous. »
- **Réponse 403 avec le code `PASSWORD_CHANGE_REQUIRED`** : renvoi vers `/premiere-connexion`.
- **Autre réponse 403**, ou page dont la permission manque : écran « Accès refusé », avec le rôle de l'utilisateur et un lien de retour à l'accueil.

## 6. Frontend

### 6.1 Routes

| Adresse | Écran | Accès |
|---------|-------|-------|
| `/connexion` | AUTH-01 Connexion | Non connecté |
| `/mot-de-passe-oublie` | AUTH-02 Mot de passe oublié | Non connecté |
| `/reinitialisation` | AUTH-03 Réinitialisation | Public |
| `/premiere-connexion` | Changement obligatoire | Connecté, uniquement si `must_change_password` |
| `/profil/mot-de-passe` | AUTH-05 Modification du mot de passe | Connecté |
| `/acces-refuse` | AUTH-04 Accès refusé | Connecté |
| `/` | Accueil | Connecté, mot de passe à jour |

### 6.2 Composants

- `AuthLayout` : les deux colonnes de la maquette, avec le panneau ébène, la texture bois, le halo, le cercle doré, la marque, le titre, le texte et les 3 fonctionnalités. Il sert aux écrans AUTH-01, AUTH-02, AUTH-03 et au changement obligatoire.
- `AuthCard` : la carte blanche aux coins de 18 px.
- `IconInput` : champ avec une icône à gauche, 38 px de haut, focus or.
- `PasswordInput` : champ avec l'icône cadenas et le bouton œil.
- `PasswordRequirements` : liste des exigences cochées en direct, annoncée aux lecteurs d'écran.
- `FormAlert` : bandeau d'erreur ou de succès de la maquette.
- `RequirePermission` : affiche l'écran « Accès refusé » si une permission manque.
- Gestion globale des réponses 401 et 403 dans le client Axios.

Dans l'application, le bloc du profil en haut à droite ouvre un menu avec « Modifier mon mot de passe » et « Se déconnecter ».

## 7. Page de connexion : fidélité à la maquette

| Élément | Traitement |
|---------|-----------|
| Deux colonnes 1,06 / 1, colonnes empilées sous 940 px | Repris à l'identique |
| Texture bois, halo doré, cercle doré en haut à droite | Repris à l'identique |
| Logo dégradé or 46 px, « DC-KNOWING », « GED · CGA » | Repris (monogramme à remplacer par le logo officiel quand il sera fourni) |
| Titre et paragraphe | Repris ; « édition cabinet » en or clair sur sa propre ligne, **sans tiret long** |
| 3 fonctionnalités | Reprises (masquées sous 940 px, comme dans la maquette) |
| Pied de page « Maquette… Données fictives » | Remplacé par « DC-KNOWING CGA · Accès réservé aux personnes autorisées » |
| Carte « Connexion sécurisée » et son sous-titre | Repris |
| Champs avec icônes, bouton œil, focus or | Repris |
| Libellé du champ e-mail | « Adresse e-mail professionnelle » |
| Exemple dans le champ e-mail | Sans domaine tant que le domaine du cabinet n'est pas confirmé |
| « Se souvenir de moi » | Supprimé ; « Mot de passe oublié ? » reste aligné à droite |
| Bouton or pleine largeur, états de chargement | Repris ; « Connexion en cours » pendant l'attente |
| Accès de démonstration et mot de passe `demo1234` | **Supprimés** (sécurité) |
| Accessibilité | Libellés reliés aux champs, focus visible, erreurs annoncées, contraste du texte d'aide relevé |

## 8. Fichiers prévus

**Backend**
- 3 migrations : colonnes de `users`, `login_lockouts` et `password_histories`, `audit_logs`.
- Modèles : `AuditLog`, `PasswordHistory`, `LoginLockout`.
- Services :
  - `AuditLogger` ;
  - `LoginLockoutService` ;
  - `PasswordService` (changement, historique, mot de passe temporaire) ;
  - `SessionInvalidator` ;
  - `UserAdministrationService` (création, rôle, activation, protection G1 et G2).
- Règle de validation : `StrongPassword` (politique et historique).
- Middleware : `EnsureAccountIsActive`, `EnsurePasswordIsChanged`.
- Contrôleurs : `AuthController` (complété), `PasswordController`, `PasswordResetController`, `Admin\UserController`, `Admin\AuditLogController`.
- Notification : réinitialisation de mot de passe en français.
- Traductions : `lang/fr` (validation, mots de passe, authentification).
- Configuration : `SESSION_LIFETIME=30`, `FRONTEND_URL`.

**Frontend** : les composants de la section 6.2, les écrans AUTH-01 à AUTH-05 et le changement obligatoire, et le traitement global des réponses 401 et 403.

**Fichiers existants modifiés** :
- `LoginRequest` : nouveau verrouillage ;
- `AuthController` et `User` : champs et relations ;
- `AppServiceProvider` : politique de mot de passe ;
- `routes/api.php` ;
- `bootstrap/app.php` : alias des middlewares ;
- `.env` et `.env.example` ;
- `LoginPage` : reconstruite ;
- `AppLayout` : menu du profil.

## 9. Tests

Chaque règle a au moins un test automatisé dont le nom commence par son numéro, par exemple `test_A5_account_is_locked_for_15_minutes_after_5_failures`.

| Domaine | Exemples de vérifications |
|---------|---------------------------|
| Connexion | Bons et mauvais identifiants ; message identique pour une adresse inconnue ; 5e échec qui verrouille ; refus pendant 15 minutes même avec le bon mot de passe ; déblocage après 15 minutes (horloge simulée) ; remise à zéro après un succès |
| Première connexion | Mot de passe temporaire conforme à la politique ; toute API refusée avec `PASSWORD_CHANGE_REQUIRED` ; accès rétabli après le changement |
| Mots de passe | Chaque exigence refusée isolément ; refus de l'actuel et des 2 précédents ; acceptation du 4e plus ancien ; mot de passe actuel faux refusé ; autres sessions supprimées, session courante conservée |
| Mot de passe oublié | Réponse identique ; e-mail envoyé seulement pour un compte actif existant ; lien réutilisé refusé ; lien expiré après 61 minutes refusé ; toutes les sessions supprimées |
| Sessions | Durée de 30 minutes ; déconnexion qui supprime la session ; désactivation et changement de rôle qui suppriment les sessions ; compte désactivé pendant une session : requête suivante refusée |
| Permissions | Route d'administration refusée sans `users.manage` ; journal refusé sans `journal.view` |
| Journal | Chaque événement présent avec la date, l'e-mail et l'IP ; aucune donnée secrète dans le journal ; modification et suppression impossibles |
| Super Administrateur | Désactivation de soi refusée ; désactivation ou changement de rôle du dernier Super Administrateur actif refusé |
| Inscription | Aucune route d'inscription |
| Frontend | Validation des formulaires, messages, redirections, écran de première connexion, réponse identique de « mot de passe oublié », expiration de session, accès refusé |

Recette manuelle finale dans le navigateur, sur ordinateur, tablette et mobile, avec vérification de la console.

## 10. Points encore ouverts (n'empêchent pas l'implémentation)

1. Signification de « association à un membre ».
2. Domaine e-mail du cabinet (exemple dans le champ de connexion).
3. Serveur SMTP et adresse d'expéditeur pour la production.
4. Logo officiel (favicon et monogramme).
