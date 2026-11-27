# GED-DC-KNOWING : guide des tests de l'API avec Postman

Ce guide permet de récupérer le projet, d'installer le backend Laravel en local et d'exécuter la collection Postman qui vérifie les fonctionnalités **réellement développées** à ce jour : l'**authentification**, l'**administration des comptes**, les **départements** et les **clients**. Les autres modules de la GED (explorateur, documents, validations, archives…) ne sont pas encore implémentés et n'ont donc aucune requête dans la collection.

Fichiers concernés, tous dans `docs/postman/` :

| Fichier | Rôle |
|---------|------|
| `GED-DC-KNOWING-API.postman_collection.json` | Collection : 136 requêtes et leurs tests automatiques |
| `GED-DC-KNOWING-LOCAL.postman_environment.json` | Environnement local : adresse du backend, comptes de test |
| `scripts/build-collection.mjs` | Source de la collection et de l'environnement (voir section 13) |
| `GUIDE-TESTS-API.md` | Ce guide |

> **Comptes et mots de passe de test.** Les comptes `@postman.test` et leurs mots de passe, indiqués ici et dans l'environnement, servent **uniquement aux tests locaux**. Le seeder qui les crée refuse de s'exécuter en dehors des environnements `local` et `testing`. Ne les utilisez jamais en production.

---

## 1. Prérequis

| Outil | Version | Vérification |
|-------|---------|--------------|
| PHP | 8.3 ou plus, avec les extensions `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `intl`, `zip` | `php -v` et `php -m` |
| Composer | 2.x | `composer -V` |
| MySQL | 8.x (MariaDB 10.6 ou plus fonctionne aussi) | `mysql --version` |
| Git | toute version récente | `git --version` |
| Postman | application de bureau, version 11 ou plus récente, **ou** Postman CLI | `postman --version` |

Le frontend React (dossier `frontend/`) n'est **pas nécessaire** pour ces tests : Postman appelle directement l'API Laravel.

Sous Windows, [Laragon](https://laragon.org) fournit PHP, Composer et MySQL.

## 2. Récupérer le projet

```bash
git clone https://github.com/IT-dcknowing/GED-DC-KNOWING.git
cd GED-DC-KNOWING
```

## 3. Installer et configurer le backend

```bash
composer install
cp .env.example .env          # Windows (PowerShell) : Copy-Item .env.example .env
php artisan key:generate
```

Ouvrez ensuite `.env` et vérifiez ou ajustez ces valeurs :

```dotenv
APP_ENV=local
APP_URL=http://localhost:8004
APP_LOCALE=fr
APP_FALLBACK_LOCALE=fr

SESSION_DRIVER=database
SESSION_LIFETIME=30

# Domaines autorisés à ouvrir une session (doit contenir la valeur frontend_origin de Postman, sans « http:// »)
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# Les e-mails sont écrits dans storage/logs/laravel.log au lieu d'être envoyés
MAIL_MAILER=log
```

`APP_ENV` doit valoir `local`, sinon le seeder des comptes de test refusera de s'exécuter.

## 4. Configurer la base de données MySQL

Créez une base vide :

```sql
CREATE DATABASE `ged-dc-knowing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Puis renseignez la connexion dans `.env`. Le fichier `.env.example` propose SQLite par défaut : remplacez ces lignes.

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ged-dc-knowing
DB_USERNAME=root
DB_PASSWORD=
```

## 5. Migrations et données de test

```bash
php artisan migrate
php artisan db:seed                                        # rôles et permissions (données de référence)
php artisan db:seed --class=PostmanTestAccountsSeeder      # comptes de test Postman
```

Le dernier seeder crée les comptes ci-dessous. **Relancez-le avant chaque exécution complète de la collection** : les tests modifient ces comptes (mots de passe changés, verrouillage…), et le seeder les remet dans leur état initial. Il supprime et recrée uniquement les comptes `@postman.test`, y compris ceux que la collection a créés, et lève leurs verrouillages. Aucun autre compte n'est touché.

| Adresse e-mail | Mot de passe | Rôle | État initial | Utilisé par |
|----------------|--------------|------|--------------|-------------|
| `postman.admin@postman.test` | `PostmanAdmin2026` | Super Administrateur | actif | dossier 05 (administration) |
| `postman.collaborateur@postman.test` | `PostmanCollab2026` | Collaborateur | actif | dossiers 02 et 08 |
| `postman.directeur@postman.test` | `PostmanDirect2026` | Directeur du Cabinet | actif | dossier 10 (journal d'audit), CLIENTS |
| `postman.desactive@postman.test` | `PostmanInactif2026` | Collaborateur | **désactivé** | dossiers 03 et 09 |
| `postman.premiere@postman.test` | `PostmanTemp2026a` | Collaborateur | actif, **mot de passe à changer** | dossier 07 |
| `postman.verrouillage@postman.test` | `PostmanVerrou2026` | Collaborateur | actif | dossiers 04 à 06 (verrouillage), DEP.09 à DEP.11, CLIENTS |
| `postman.reinit@postman.test` | `PostmanReinit2026` | Collaborateur | actif | dossiers 09 et 11 (mot de passe oublié) |
| `postman.responsable@postman.test` | `PostmanRespDep2026` | Responsable de Département | actif, responsable du département de test | dossier DÉPARTEMENTS |

L'adresse `postman.inconnu@postman.test` n'a volontairement aucun compte : elle sert aux tests « adresse inconnue ».

Le seeder remet aussi le département de test `DEP-TEST` dans son état initial (actif, avec `postman.responsable@postman.test` pour responsable) et efface les départements créés par la collection (codes commençant par `PM-`).

## 6. Démarrer le serveur Laravel

```bash
php artisan serve --port=8004
```

Contrôle : http://localhost:8004/api/v1/health doit répondre `{"status":"ok","database":"ok"}`.

## 7. Importer la collection

Dans Postman : **Import**, puis glissez le fichier `docs/postman/GED-DC-KNOWING-API.postman_collection.json`.

La collection contient un dossier **AUTHENTIFICATION**, découpé en sous-dossiers numérotés de 00 à 11. Les numéros entre parenthèses dans le nom des requêtes (A1… H1) renvoient aux 35 règles d'authentification (section 12).

Le sous-dossier 05 (administration des comptes) contient aussi les contrôles du module « Utilisateurs et rôles » :

- 05.2 : liste des 7 rôles avec leur description, leurs permissions et le nombre de comptes, plus le catalogue des 17 permissions ;
- 05.4b : recherche contenant « % », prise littéralement (A2) ;
- 05.7 et 05.8 : date et auteur de la création du compte (A4) ;
- 05.11b : refus de modifier son propre rôle (A1).

Le dossier **DÉPARTEMENTS (lot 1.3)** vient après. Il peut aussi être exécuté seul (`-i "DÉPARTEMENTS (lot 1.3)"`), car il récupère lui-même le cookie CSRF. Il vérifie :

- DEP.01 à DEP.11 : la consultation selon le rôle (D1). Le Directeur voit tous les départements mais ne peut pas en créer ; le Responsable de Département ne voit que le sien ; le Collaborateur est refusé ;
- DEP.12 à DEP.16 : la création par le Super Administrateur (D2), avec le code mis en majuscules, unique et non modifiable (D7) ;
- DEP.17 à DEP.20 : le responsable (D4), avec le refus d'un compte rattaché à un autre département ou de rôle Collaborateur, puis le retrait et la désignation ;
- DEP.21 à DEP.24 : la désactivation (D6), refusée tant que des comptes actifs sont rattachés, puis la désactivation, la réactivation et l'absence de suppression ;
- DEP.25 et DEP.26 : le journal d'audit (création et désactivation du département).

Le dossier **CLIENTS (lot 2.1)** vient ensuite. Il peut aussi être exécuté seul (`-i "CLIENTS (lot 2.1)"`). Il vérifie :

- CLI.03 et CLI.04 : les champs obligatoires (C1) et le refus d'un département inconnu ;
- CLI.05 à CLI.07 : la création d'un département de suivi distinct, puis de deux clients, avec code `CLI-…` généré (C2), dénomination en majuscules et compteurs de documents encore nuls ;
- CLI.08 et CLI.09 : le code non modifiable (C4), puis la modification des champs et des départements ;
- CLI.10 à CLI.12 : la fiche, la recherche par code et le filtre par département ;
- CLI.13 : l'absence de route de suppression (C4) ;
- CLI.14 et CLI.15 : le journal d'audit (création et modification du client) ;
- CLI.17 à CLI.21 : le Directeur voit tout le cabinet, mais ne peut ni créer ni modifier un client ;
- CLI.22 à CLI.27 : le Collaborateur ne voit que son département (C3), consulte la fiche autorisée, reçoit un refus hors périmètre et ne peut pas créer de client.

## 8. Importer l'environnement

**Import** du fichier `docs/postman/GED-DC-KNOWING-LOCAL.postman_environment.json`, puis sélectionnez l'environnement **GED-DC-KNOWING-LOCAL** en haut à droite de Postman.

## 9. Renseigner les variables

L'environnement est prêt pour une installation locale standard. Modifiez seulement ce qui diffère chez vous.

| Variable | Valeur par défaut | À modifier si… |
|----------|-------------------|----------------|
| `base_url` | `http://localhost:8004` | le backend tourne à une autre adresse ou sur un autre port |
| `frontend_origin` | `http://localhost:5173` | vous avez changé `SANCTUM_STATEFUL_DOMAINS` (les deux doivent correspondre) |
| `*_email`, `*_password` | comptes du seeder (section 5) | jamais, sauf si vous modifiez le seeder |
| `new_password`, `first_login_new_password`, `reset_new_password` | nouveaux mots de passe choisis pendant les tests | à volonté, en respectant la politique : 10 caractères minimum, avec une majuscule, une minuscule et un chiffre |
| `reset_token` | vide | à renseigner pour l'étape manuelle (section 10.3) |
| `user_id` | vide | jamais : rempli automatiquement |

**Il n'y a pas de variable « token ».** L'API n'utilise pas de jeton « Bearer » : l'authentification repose sur **Laravel Sanctum en mode SPA**, c'est-à-dire un cookie de session et un jeton CSRF. Tout est automatique :
- la requête `00.2 Cookie CSRF` obtient le cookie `XSRF-TOKEN` ;
- le script de la collection ajoute à chaque requête les en-têtes `Referer` (valeur de `frontend_origin`) et `X-XSRF-TOKEN`, et met à jour le jeton après chaque réponse ;
- Postman conserve et renvoie seul le cookie de session.

Ne renseignez jamais de vrai mot de passe ni de jeton dans le fichier d'environnement versionné. Si vous avez besoin de valeurs personnelles, faites-en une copie nommée `*.local.postman_environment.json` : ce nom est exclu de Git.

## 10. Exécuter les tests

### 10.1 Avec l'application Postman (Runner)

1. Relancez `php artisan db:seed --class=PostmanTestAccountsSeeder`.
2. Cliquez sur la collection, puis sur **Run**.
3. Gardez l'ordre des requêtes, et réglez **Delay** sur **3500 ms**.
4. Lancez l'exécution (10 à 12 minutes environ).

**Pourquoi 3 500 ms ?** L'API limite les tentatives : 20 connexions par minute et par adresse IP, 5 demandes de réinitialisation par minute, 5 changements de mot de passe par minute et par compte. Sans délai, vous obtiendrez des erreurs 429, qui sont le comportement normal de l'API.

**Exécutez la collection en entier et dans l'ordre.** Les dossiers dépendent les uns des autres :
- tous ont besoin du cookie CSRF obtenu en 00.2 ;
- 05.4 attend le verrouillage provoqué en 04 ;
- 06 attend le déverrouillage fait en 05.5 ;
- le dossier 10 vérifie des événements produits par les dossiers précédents ;
- le dossier CLIENTS s'appuie sur le département `DEP-TEST` et les comptes créés par le seeder ; il crée ses propres clients et un département `PM-CLI-…`, effacés à la remise à zéro suivante.

Seul le dossier 11 se lance à part (section 10.3).

Les requêtes en boucle (02.5 rejouée 3 fois, 04.1 rejouée 4 fois) ne se répètent qu'avec le Runner ou la CLI. Avec un simple **Send**, elles ne partent qu'une fois.

### 10.2 Avec Postman CLI

```bash
php artisan db:seed --class=PostmanTestAccountsSeeder
postman collection run docs/postman/GED-DC-KNOWING-API.postman_collection.json \
  -e docs/postman/GED-DC-KNOWING-LOCAL.postman_environment.json \
  --delay-request 3500
```

Le message « No authorization data found. Please use the `postman login` command » concerne uniquement la publication des résultats sur le cloud de Postman. Il n'empêche pas l'exécution locale.

### 10.3 Étape manuelle : réinitialisation par le lien reçu (dossier 11)

Le lien de réinitialisation arrive par e-mail. En local, il est écrit dans `storage/logs/laravel.log`. Après une exécution complète :

1. Ouvrez `storage/logs/laravel.log` et cherchez le **dernier** lien de la forme
   `http://localhost:5173/reinitialisation?token=XXXXXXXX…&email=postman.reinit%40postman.test`.
2. Copiez la valeur de `token` (64 caractères), **sans** la partie `&email=…`.
3. Collez-la dans la variable `reset_token` de l'environnement.
4. Exécutez **uniquement le dossier 11**, dans le Runner ou avec la CLI :
   ```bash
   postman collection run docs/postman/GED-DC-KNOWING-API.postman_collection.json \
     -e docs/postman/GED-DC-KNOWING-LOCAL.postman_environment.json \
     -i "11 · [Manuel] Réinitialisation avec le lien reçu (D2, D4, D6)" \
     --env-var "reset_token=COLLEZ_LE_JETON_ICI" --delay-request 1500
   ```

Ne relancez pas le dossier 09 entre-temps : il demanderait un nouveau lien, ce qui invaliderait le jeton copié. Le lien expire au bout d'une heure.

Sans jeton, les requêtes 11.1 à 11.4 sont **ignorées**, avec le message « Requête ignorée : renseignez la variable reset_token ». Elles ne sont jamais comptées comme réussies.

## 11. Interpréter les résultats

| Résultat | Signification |
|----------|---------------|
| **Pass** | La vérification a été exécutée et le comportement est conforme |
| **Fail** | La vérification a été exécutée et le comportement diffère : voir le tableau ci-dessous |
| **Requête ignorée (skipped)** | La requête n'a pas été envoyée (étape manuelle sans jeton). Ce n'est ni un succès ni un échec |

Chaque requête vérifie au minimum :
- le code HTTP ;
- la structure de la réponse et ses champs ;
- le message ou le code d'erreur attendu ;
- l'absence de trace technique (`trace`, `exception`) dans la réponse.

Les contrôles du journal d'audit vérifient en plus que l'entrée trouvée date bien de l'exécution en cours.

**Résultat de référence**, obtenu le 25/11/2026 sur un poste local avec Postman CLI 1.74 :

| Exécution | Requêtes envoyées | Vérifications | Échecs |
|-----------|-------------------|---------------|--------|
| Collection complète, sans jeton de réinitialisation | 137 (136 requêtes, dont une répétée en boucle) ; 4 requêtes manuelles ignorées | 438 | 0 |
| Dossier 11 seul, avec le jeton (exécution du 24/11/2026, dossier inchangé depuis) | 5 | 13 | 0 |

**Causes d'échec fréquentes :**

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Erreur 419 « CSRF token mismatch » | Cookie CSRF absent ou expiré | Exécuter la collection depuis le début (00.2) |
| Erreur 400 `SESSION_REQUIRED` à la connexion | `frontend_origin` n'est pas dans `SANCTUM_STATEFUL_DOMAINS` | Faire correspondre les deux valeurs (section 3), puis `php artisan config:clear` |
| Erreur 429 `TOO_MANY_REQUESTS` | Délai entre requêtes insuffisant | Délai de 3 500 ms ; attendre une minute avant de relancer |
| 422 « bloquée pendant 15 minutes » sur des comptes qui ne devraient pas l'être | Comptes non remis à zéro depuis la dernière exécution | Relancer `PostmanTestAccountsSeeder` |
| 02.6 ou 08.1 en échec avec « mot de passe incorrect » | Le mot de passe du compte standard a été changé par une exécution précédente (08.2) | Relancer `PostmanTestAccountsSeeder` |
| 00.1 en échec | Serveur arrêté ou base inaccessible | Section 6 ; vérifier les identifiants MySQL de `.env` |
| Erreur 500 | Erreur serveur | Consulter `storage/logs/laravel.log` |

## 12. Couverture des 35 règles et limites

Les règles RG-AUTH-01 à RG-AUTH-35 correspondent, dans l'ordre, aux règles A1 à H1 de `docs/conception/AUTHENTIFICATION.md`.

| RG-AUTH | Règle | Postman | Requêtes |
|---------|-------|---------|----------|
| 01 | A1 Connexion par e-mail et mot de passe | Automatique | 02.6 |
| 02 | A2 Vérification par le serveur | Automatique | 02.1, 02.6 |
| 03 | A3 Gestion des erreurs de connexion | Automatique | 02.1, 02.2, 03.1 |
| 04 | A4 Message identique (adresse inconnue ou mot de passe faux) | Automatique | 02.2, 02.3 |
| 05 | A5 Verrouillage après 5 échecs consécutifs, 15 minutes | Automatique, **sauf la durée de 15 minutes** (PHPUnit) | 04.1 à 04.3, 05.4, 05.5, 06.1 |
| 06 | A6 Compteur remis à zéro après un succès | Automatique | 02.2, 02.5, 02.6, 02.12 |
| 07 | A7 Autorisations chargées après identification | Automatique | 02.6, 02.7 |
| 08 | B1 Comptes créés uniquement par l'administrateur | Automatique | 05.7 |
| 09 | B2 Mot de passe temporaire généré | Automatique | 05.7, 05.8, 05.13 |
| 10 | B3 Changement obligatoire à la première connexion | Automatique | 07.1, 07.8 |
| 11 | B4 Rien d'accessible avant ce changement | Automatique | 07.2, 07.3, 07.9 |
| 12 | C1 10 caractères minimum | Automatique | 07.5 |
| 13 | C2 Majuscule, minuscule et chiffre | Automatique | 07.6 |
| 14 | C3 Stockage haché (bcrypt) | **Non testable par l'API** (PHPUnit) | |
| 15 | C4 Pas de réutilisation des 3 derniers mots de passe | Automatique pour le mot de passe actuel ; profondeur complète par PHPUnit | 07.7 |
| 16 | C5 Modification avec vérification du mot de passe actuel | Automatique | 07.4, 08.2 à 08.5 |
| 17 | C6 Fermeture des autres sessions | **Non testable avec une seule session** (PHPUnit) | |
| 18 | D1 Formulaire de demande | Automatique | 09.1 à 09.4 |
| 19 | D2 Envoi du lien par e-mail | **Manuel** | 09.3, puis 11.1 et 11.3 |
| 20 | D3 Réponse identique que l'adresse existe ou non | Automatique | 09.2 à 09.4 |
| 21 | D4 Lien utilisable une seule fois | Automatique pour un lien invalide ; **manuel** pour la réutilisation | 09.5, 11.2 |
| 22 | D5 Expiration après une heure | **Non testable dans Postman** : il faudrait attendre une heure (PHPUnit) | |
| 23 | D6 Sessions fermées après une réinitialisation | **Manuel**, partiel ; complet par PHPUnit | 11.1 |
| 24 | E1 Expiration après 30 minutes d'inactivité | **Non testable dans Postman** : il faudrait attendre 30 minutes (PHPUnit) | |
| 25 | E2 Déconnexion effective côté serveur | Automatique | 02.10, 02.11 |
| 26 | E3 Sessions fermées après une désactivation ou un changement de rôle | Automatique pour le refus de connexion, la désactivation et le changement de rôle ; fermeture des sessions ouvertes par PHPUnit | 03.1, 05.9, 05.10 |
| 27 | E4 Autorisations vérifiées à chaque requête | Automatique | 01.1 à 01.4, 02.8, 02.9, 07.9, 10.2 |
| 28 | F1 Journal : connexions réussies et échouées | Automatique | 10.3, 10.4 |
| 29 | F2 Journal : verrouillages | Automatique | 10.5 |
| 30 | F3 Journal : réinitialisations | Automatique pour la demande ; la réinitialisation effective par PHPUnit | 10.6 |
| 31 | F4 Journal : modifications de mot de passe | Automatique | 10.7 |
| 32 | F5 Journal : déconnexions | Automatique | 10.8 |
| 33 | G1 Impossible de désactiver son propre compte | Automatique | 05.11 |
| 34 | G2 Toujours au moins un Super Administrateur actif | **Non testable de façon fiable** : dépend du nombre d'administrateurs présents en base (PHPUnit) | |
| 35 | H1 Aucune inscription publique | Automatique | 01.5 |

**Les règles signalées « PHPUnit » sont vérifiées par les tests automatisés du backend**, qui simulent l'écoulement du temps et plusieurs sessions :

```bash
php artisan test
```

**Autres limites :**
- **Base partagée** : les tests créent des comptes `postman.cree.*@postman.test` et ajoutent des entrées au journal d'audit, qui ne peut pas être modifié. Utilisez une base locale dédiée au développement, **jamais** une base de production.
- **E-mails** : seul le mode `MAIL_MAILER=log` est couvert. L'envoi réel (SMTP) n'est pas encore configuré : le serveur et l'adresse d'expéditeur restent à fournir par le cabinet.
- **Délais** : la mesure d'un temps de réponse n'est pas un objectif de ces tests. Sur un poste lent, certaines réponses peuvent dépasser plusieurs secondes.

## 13. Faire évoluer la collection

La collection et l'environnement sont **générés** par `docs/postman/scripts/build-collection.mjs` (Node.js 18 ou plus). Pour ajouter ou modifier une requête, modifiez ce script, puis :

```bash
node docs/postman/scripts/build-collection.mjs
```

Ne modifiez pas les fichiers JSON à la main : ils seraient écrasés à la génération suivante. N'ajoutez une requête que pour une route qui existe réellement (`php artisan route:list --path=api`).
