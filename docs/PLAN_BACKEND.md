# Plan de développement du backend

Ce document liste tout ce qui reste à construire côté Laravel, lot par lot, dans l'ordre où nous allons le faire. On le suit étape par étape : un lot n'est commencé qu'après la validation du précédent.

Sources : cahier des charges v1.1 (CDC), maquette HTML, rapport d'audit `docs/audit/RAPPORT_AUDIT_PHASE_1.md`, journal `docs/DECISIONS.md`.

Dernière mise à jour : 25/11/2026.

## Comment lire ce plan

**Statuts possibles d'un lot :**

| Statut | Signification |
|--------|---------------|
| Terminé | Développé, testé, validé et commité |
| À valider | Développé et testé, en attente de votre validation ou du commit |
| En cours | Développement commencé |
| Prêt | Les décisions nécessaires sont prises, le lot peut démarrer |
| Bloqué | Une ou plusieurs questions doivent d'abord être tranchées (voir « Prérequis ») |

**Déroulement de chaque lot :**

1. Audit du lot : ce que disent le CDC et la maquette, ce qui existe, les écarts, les décisions à prendre.
2. Vos décisions, consignées dans `docs/DECISIONS.md`.
3. Développement backend, puis écran React.
4. Tests, puis rapport : fichiers modifiés, fonctionnalités, tests réellement exécutés, anomalies restantes.
5. Validation, puis commit sur demande.

Les lots des phases 3 à 7 sont décrits à grands traits. Leur contenu exact sera précisé par l'audit du lot, au moment de le commencer.

## Règles communes à tous les lots

Un lot n'est terminé que si tous ces points sont respectés.

- **Droits vérifiés par le serveur (RG-08) :** chaque route est protégée par une permission ou une Policy Laravel, même si l'écran masque déjà le bouton.
- **Validation des entrées :** une Form Request par action d'écriture, avec des messages d'erreur en français.
- **Réponses :** API Resources ; erreurs au format commun (message en français et code : `FORBIDDEN`, `NOT_FOUND`…).
- **Journal d'audit :** toute action sensible écrit une entrée dans la table `audit_logs`, en ajout seul (`AuditLogger`, événements de l'enum `AuditEvent`).
- **Tests :**
  - PHPUnit pour chaque règle, chaque refus de droit et chaque cas limite ;
  - Vitest pour l'écran ;
  - une exécution réelle de la collection Postman.
- **Postman :** la collection est mise à jour uniquement pour les changements du lot (`docs/postman/scripts/build-collection.mjs`).
- **Données :**
  - aucune donnée fictive en production ;
  - les jeux de données de test restent limités aux environnements local et testing.
- **Interface :** les directives de design non négociables s'appliquent (pas de tiret long, pas de bouton en pilule, pas d'emoji, pas de faux chiffres).
- **Sécurité :** aucun secret dans le dépôt ; ne pas modifier les règles d'authentification validées.

## Vue d'ensemble

| Lot | Contenu | Phase | Statut | Prérequis |
|-----|---------|-------|--------|-----------|
| 1.1 | Authentification | 1. Socle | Terminé | - |
| 1.2 | Utilisateurs et rôles | 1. Socle | Terminé | - |
| 1.3 | Départements | 1. Socle | Terminé | D1 à D9 validées le 25/11/2026 |
| 2.1 | Clients | 2. Référentiels | Terminé | C1 à C4 validées le 25/11/2026 |
| 2.2 | Arborescence et modèle de dossier client | 2. Référentiels | Bloqué | Q-05, Q-06 |
| 2.3 | Exercices annuels | 2. Référentiels | Bloqué | Q-10, MAN-05 |
| 2.4 | Droits par périmètre | 2. Référentiels | Bloqué | Lots 2.1 à 2.3 ; Q-11 et Q-14 à confirmer |
| 3.1 | Référentiels documentaires et nommage | 3. Documents | Bloqué | Q-07, INC-01, INC-02 |
| 3.2 | Dépôt et stockage sécurisés | 3. Documents | Bloqué | Q-03, Q-04, CDC-02 |
| 3.3 | Versions et métadonnées | 3. Documents | Bloqué | INC-07 |
| 3.4 | Consultation, aperçu, téléchargement | 3. Documents | Bloqué | Lot 3.2 |
| 3.5 | Explorateur, recherche, filtres | 3. Documents | Bloqué | Lots 3.2 à 3.4 |
| 3.6 | Déplacement, suppression logique, corbeille | 3. Documents | Bloqué | Lot 3.5 |
| 4.1 | Circuit de validation | 4. Validation | Bloqué | Q-12, MAN-06 |
| 4.2 | Notifications internes | 4. Validation | Bloqué | Canal de notification (CDC section 15) |
| 5.1 | Archivage et réouverture des exercices | 5. Archivage | Bloqué | Q-16, CDC-05, CDC-06 |
| 5.2 | Espace 99_ARCHIVES et radiation des clients | 5. Archivage | Bloqué | Q-17, INC-04, INC-06 |
| 6.1 | Journal d'activité (consultation) | 6. Pilotage | Bloqué | Événements des lots précédents |
| 6.2 | Tableau de bord | 6. Pilotage | Bloqué | Lots 3 à 5 |
| 6.3 | Paramètres | 6. Pilotage | Bloqué | Q-19 |
| 6.4 | Alertes d'échéances CGA (optionnel) | 6. Pilotage | Bloqué | Q-18 |
| 7.1 | Durcissement et mise en production | 7. Production | Bloqué | Q-03, Q-08 |

---

## Phase 1 : socle

### Lot 1.1 : Authentification (Terminé)

Livré et publié (commit `f50eac6`). Conception : `docs/conception/AUTHENTIFICATION.md` (35 règles A1 à H1).

- Connexion et déconnexion, session Sanctum par cookie.
- Mot de passe : politique de complexité, changement obligatoire à la première connexion, réinitialisation par e-mail.
- Verrouillage après 5 échecs, sessions de 30 minutes d'inactivité.
- Journal d'audit en ajout seul.

### Lot 1.2 : Utilisateurs et rôles (Terminé)

Livré et publié le 25/11/2026. Rapport : `docs/rapports/RAPPORT_ACTIVITE_2026-11-25.md`.

- **Comptes :** liste, recherche, filtres, création avec mot de passe temporaire, modification, activation et désactivation, nouveau mot de passe temporaire, déverrouillage.
- **Règles A1 à A4 :**
  - pas de changement de son propre rôle ;
  - recherche littérale ;
  - indicateur de verrouillage par compte ;
  - auteur et date de la création affichés.
- **Rôles :** 7 rôles avec description, permissions appliquées et nombre de comptes, accompagnés de la mention « Répartition provisoire ».

### Lot 1.3 : Départements (Terminé)

Livré et publié le 25/11/2026. Rapport : `docs/rapports/RAPPORT_ACTIVITE_2026-11-25.md`.

**Objectif.** Créer et tenir à jour les départements du cabinet, désigner leur responsable et consulter leurs collaborateurs (CDC section 3, RG-01).

**Décisions appliquées (25/11/2026) :**

| # | Décision |
|---|----------|
| D1 | Consultation selon le rôle, sans nouvelle permission :<br>- Super Administrateur, Directeur et Responsable GED : tous les départements ;<br>- Responsable de Département : le sien ;<br>- autres rôles : refus 403. |
| D2 | Création, modification, activation et désactivation : permission `departments.manage`, qui revient au Super Administrateur seul. |
| D3 | Un seul département par compte (`users.department_id`), pas de table de liaison. |
| D4 | Conditions pour être responsable :<br>- compte actif, de rôle « Responsable de Département », déjà rattaché à ce département ;<br>- un seul responsable par département.<br>La désignation est retirée automatiquement, et journalisée, si ce compte est désactivé, change de rôle ou change de département. |
| D5 | Collaborateurs en consultation seule ; le rattachement se fait dans « Utilisateurs et rôles ». La gestion par le Responsable de Département attend Q-13. |
| D6 | Désactivation refusée tant que des comptes actifs sont rattachés au département. Aucune suppression ; réactivation possible. |
| D7 | Code : 2 à 20 caractères, lettres majuscules, chiffres et tirets (ex. `DEP-01`) ; unique ; non modifiable après la création. |
| D8 | Nombre de documents et dernière activité : non affichés avant le lot 3. Les clients suivis sont disponibles depuis le lot 2.1. |
| D9 | Aucun département réel créé automatiquement (intitulés à confirmer, CDC section 15). En local, `DEP-TEST` reçoit un responsable dans les jeux de données de test. |

**Données.**
- La table `departments` existe déjà : code, nom, `manager_id`, `is_active`.
- À ajouter :
  - `created_by` (auteur de la création, comme pour les comptes) ;
  - un contrôle en base que `manager_id` n'est attribué qu'à un seul département.

**API.**

| Méthode et route | Droit | Rôle |
|------------------|-------|------|
| `GET /api/v1/departments` | Policy `viewAny` (D1) | Liste avec code, nom, statut, responsable, nombre de collaborateurs actifs. Le Responsable de Département ne reçoit que le sien. |
| `GET /api/v1/departments/{id}` | Policy `view` (D1) | Détail avec la liste des membres : nom, rôle, statut du compte. |
| `POST /api/v1/departments` | `departments.manage` | Création : code et nom. Le responsable est désigné ensuite par une modification, car il doit déjà être rattaché au département (D4). |
| `PATCH /api/v1/departments/{id}` | `departments.manage` | Modification du nom et du responsable. Le code ne peut pas être modifié. |
| `POST /api/v1/departments/{id}/deactivate` | `departments.manage` | Refusée si des comptes actifs sont rattachés (D6). |
| `POST /api/v1/departments/{id}/activate` | `departments.manage` | Réactivation. |

La route `GET /api/v1/admin/departments`, utilisée par le formulaire des comptes, reste inchangée.

**Règles serveur.**
- **Policy `DepartmentPolicy`**, la première Policy du projet : elle porte D1 et D2.
- **Validation du responsable (D4) :** le compte désigné doit être actif, avoir le rôle `resp_dept`, être rattaché à ce département, et ne diriger aucun autre département.
- **Retrait automatique de la désignation (D4),** dans `UserAdministrationService`. C'est la seule modification du lot 1.2 ; elle a lieu quand le responsable :
  - est désactivé ;
  - change de rôle ;
  - change de département.

**Journal d'audit.** Nouveaux événements :
- `admin.department.created` ;
- `admin.department.updated` (le détail du changement de responsable y figure) ;
- `admin.department.deactivated` ;
- `admin.department.activated` ;
- `admin.department.manager_removed` (retrait automatique, D4).

**Tests.**
- **PHPUnit :**
  - droits de chaque rôle en consultation et en gestion ;
  - règles D4, D6 et D7 ;
  - retrait automatique de la désignation ;
  - entrées du journal.
- **Postman :** nouveau dossier « DÉPARTEMENTS ».
- **Écran associé :** `/departements`, dans le groupe « Documents » du menu, comme dans la maquette. Il montre des cartes accessibles au clavier, une fenêtre de détail et un formulaire de création et de modification.

---

## Phase 2 : référentiels

### Lot 2.1 : Clients (Terminé)

Livré et publié le 25/11/2026. Décisions C1 à C4 : voir `docs/DECISIONS.md`. Rapport : `docs/rapports/RAPPORT_ACTIVITE_2026-11-25.md`.

**Objectif.** Tenir le référentiel des clients du cabinet et leurs départements de suivi (CDC section 3, RG-02 à RG-04).

**Contenu livré.**
- **Table `clients` :** code unique, dénomination, forme juridique, secteur, régime fiscal, RCCM, DFÉ, adresse, téléphone, e-mail, contact dirigeant, date de début de la relation, état actif ou radié.
- **Table `client_department` (RG-02) :** un client est suivi par un ou plusieurs départements ; le même dossier est partagé (RG-07).
- **API :**
  - liste paginée avec recherche littérale (nom, code, secteur, contact) et filtre par département ;
  - fiche détaillée ;
  - création et modification réservées à `clients.manage` ;
  - rattachement aux départements ;
  - aucune route de suppression : un client sera radié au lot 5.2, avec conservation de son code.
- **Code (C2, C4) :** généré par le serveur au format `CLI-0001`, refusé en entrée, jamais modifiable.
- **Champs obligatoires (C1) :** dénomination de 3 à 160 caractères et au moins un département ; les autres champs restent facultatifs. La dénomination est enregistrée en majuscules.
- **Visibilité (C3, Q-14 provisoire) :** Super Administrateur, Directeur et Responsable GED voient tout le cabinet ; Responsable de Département et Collaborateur voient les clients de leur département ; Stagiaire et Auditeur ne voient aucun client avant le lot 2.4.
- **Journal :** `admin.client.created` et `admin.client.updated`, avec l'auteur, le client et les changements.
- **Écran associé :** `/clients`, dans le groupe « Documents » du menu. Tableau Code, Client, Départements associés, Documents, Dernière activité et Actions ; recherche, filtre département, formulaire de création et de modification, fiche détaillée. Les compteurs de documents et la dernière activité restent à « — » tant que le lot 3 n'existe pas.
- **Tests :** 13 tests backend (126 assertions) et 6 tests frontend.
- **Postman :** dossier « CLIENTS (lot 2.1) ».

### Lot 2.2 : Arborescence et modèle de dossier client (Bloqué)

**Objectif.** Représenter en base l'arborescence de référence (CDC section 4) et générer le dossier de chaque client (RG-03 à RG-05).

**Contenu prévu.**
- **Table `folders` :** parent, chemin, profondeur, nature (espace, client, modèle, permanent, exercice, rubrique, libre), marqueurs « restreint » et « lecture seule ».
- **Espaces internes :** 00_DIRECTION, 02 à 06, 99_ARCHIVES, et la racine 01_CLIENTS.
- **Modèle `_MODELE_DOSSIER_CLIENT` :** A_PERMANENT (A1 à A4) et B_EXERCICES, appliqué automatiquement à la création d'un client.
- **Dossiers structurels verrouillés :** ni renommage ni suppression.
- **Création de dossiers libres** (`folders.create`) :
  - contrôle de la profondeur maximale (MAN-12) ;
  - aucun dossier de niveau 1 ou 2 sans validation (CDC 4.3).

**Prérequis :**
- **Q-05 :** point de départ du comptage des 4 niveaux ;
- **Q-06 :** noms des sous-dossiers des espaces 02 à 06 et 99.

### Lot 2.3 : Exercices annuels (Bloqué)

**Objectif.** Gérer les exercices de chaque client et leurs 7 rubriques (RG-06).

**Contenu prévu.**
- **Table `exercises` :** client, année, statut (actif, clôturé, archivé), dates.
- **Création d'un exercice :** elle crée son dossier sous B_EXERCICES, avec les rubriques 1_Pieces à 7_Courriers_Honoraires.
- **Unicité :** un exercice par client et par année.
- **Clôture d'un exercice** (MAN-05, CDC-06).

**Prérequis :**
- **Q-10 :** exercice toujours sur l'année civile ? Qui crée N+1, et quand ?
- **Règle de clôture :** qui clôture, et quand.

### Lot 2.4 : Droits par périmètre (Bloqué)

**Objectif.** Appliquer le modèle validé en Q-01 : le rôle donne les actions, le périmètre (département, client, dossier) donne l'endroit.

**Contenu prévu.**
- **Service de périmètre :** il calcule pour chaque utilisateur les clients et dossiers visibles et modifiables.
- **Table `access_grants` :** autorisations exceptionnelles par utilisateur et par périmètre (`access-grants.manage`, Super Administrateur), par exemple pour un auditeur ou un stagiaire.
- **Règles déjà décidées :** héritage vers le bas de l'arborescence ; espaces restreints fermés par défaut ; lecture seule prioritaire ; pas d'interdiction explicite.
- **Policies :** sur les clients, les dossiers, puis les documents.
- **Journal :** tout changement de droits (CDC section 9).

**Prérequis :**
- Lots 2.1 à 2.3.
- Confirmation des réglages provisoires Q-11 (espaces restreints) et Q-14 (visibilité des clients).
- Rattachement à un département obligatoire ou non pour les rôles Collaborateur, Stagiaire et Responsable de Département.

---

## Phase 3 : documents

### Lot 3.1 : Référentiels documentaires et nommage (Bloqué)

- Tables `document_types` et `document_categories`, liées aux rubriques (`settings.documentary`).
- **Nommage `AAAAMMJJ_CodeClient_TypeDoc_Objet_Statut` :** le nom de fichier est calculé à partir des métadonnées (recommandation INC-01) ; code d'espace pour les documents internes (INC-02).
- **Prérequis :** Q-07 (liste des types et catégories, types soumis à validation), INC-01, INC-02.

### Lot 3.2 : Dépôt et stockage sécurisés (Bloqué)

- **Stockage :** fichiers sur un disque privé, sous un identifiant technique, jamais dans `public/`.
- **Contrôles :**
  - extension, type MIME réel et cohérence ;
  - taille maximale paramétrable ;
  - formats interdits ;
  - empreinte du fichier pour signaler les doublons (ARB-07).
- **Fichiers suspects :** quarantaine (MAN-11) et analyse antivirus, traitée dans une file d'attente.
- **Dépôt multiple** (MAN-10).
- **Prérequis :** Q-03 (hébergement, antivirus), Q-04 (taille maximale, formats interdits), CDC-02.

### Lot 3.3 : Versions et métadonnées (Bloqué)

- Tables `documents` et `document_versions` (fichier, empreinte, type MIME, taille, auteur, note).
- **RG-09 :** un document validé n'est jamais écrasé ; un nouveau fichier crée une nouvelle version.
- **Métadonnées minimales** (CDC section 9) : type, client ou espace, dossier, département, date du document, déposant, statut, commentaire.
- **Prérequis :** INC-07 (la modification des métadonnées crée-t-elle une version ?).

### Lot 3.4 : Consultation, aperçu, téléchargement (Bloqué)

- Téléchargement par un contrôleur qui vérifie les droits (`documents.download`).
- Aperçu des formats compatibles uniquement.
- Aucune exécution possible des fichiers déposés : en-têtes `Content-Disposition` et `nosniff`.
- Journal des accès sensibles.

### Lot 3.5 : Explorateur, recherche, filtres (Bloqué)

- Contenu d'un dossier, chemin complet, accès au dossier parent.
- Recherche par nom, mot-clé et code client.
- Filtres : client, département, exercice, dossier, type, statut, période.
- Tris : nom, date de dépôt, date du document, dernière mise à jour.
- Compteurs calculés uniquement sur les documents autorisés (DEF-07).
- **À décider :** recherche plein texte et reconnaissance de texte dans les images (CDC section 15).

### Lot 3.6 : Déplacement, suppression logique, corbeille (Bloqué)

- Déplacer un document (MAN-02).
- Suppression logique (`documents.delete`) et restauration (MAN-04).
- Toutes ces actions sont journalisées.

---

## Phase 4 : validation

### Lot 4.1 : Circuit de validation (Bloqué)

- **Statuts :** Brouillon, En attente, En cours de vérification, Validé, Rejeté, Archivé (CDC section 7).
- **Transitions :**
  - soumission d'un brouillon (MAN-01, `documents.submit`) ;
  - prise en charge ;
  - approbation ;
  - rejet avec un motif obligatoire (RG-10) ;
  - correction et nouvelle soumission.
- **Table `document_decisions` :** action, auteur, date, motif.
- **Prérequis :**
  - Q-12 (qui valide, et si l'on peut valider son propre dépôt) ;
  - MAN-06 et CDC-04 (circuit variable selon le type documentaire).

### Lot 4.2 : Notifications internes (Bloqué)

- Table `notifications` ; notifications marquées comme lues.
- Événements déclencheurs : soumission, décision, proposition d'archivage.
- **Prérequis :** canal de notification (CDC section 15 : interne seulement, ou aussi par e-mail).

---

## Phase 5 : archivage

### Lot 5.1 : Archivage et réouverture des exercices (Bloqué)

- **Table `archive_requests` :** proposition (`archives.propose`), confirmation manuelle (`archives.confirm`), réouverture motivée (`archives.reopen`).
- **Règles :** exercice archivé en lecture seule (RG-11) ; réouverture autorisée, motivée et journalisée (RG-12).
- **Signalement des exercices** susceptibles d'être archivés, selon des critères paramétrables.
- **Prérequis :**
  - Q-16 : le proposant peut-il confirmer sa propre proposition ?
  - CDC-05 : critères de signalement ;
  - CDC-06 : règle de clôture.

### Lot 5.2 : Espace 99_ARCHIVES et radiation des clients (Bloqué)

- Radiation d'un client, avec conservation de son code (INC-06).
- Transfert, ou simple marquage, vers 99_ARCHIVES au-delà de la durée de conservation.
- **Prérequis :** Q-17 (règle et durées légales de conservation), INC-04.

---

## Phase 6 : pilotage

### Lot 6.1 : Journal d'activité (Bloqué)

- **Existant :** la table `audit_logs` et la route `GET /api/v1/admin/audit-logs` (`journal.view`).
- **À faire :**
  - filtres par période, utilisateur, type d'action, client et document ;
  - écran de consultation ;
  - vérification que chaque lot a bien ajouté ses événements.
- **À décider :** export CSV (non demandé par le CDC).

### Lot 6.2 : Tableau de bord (Bloqué)

- Indicateurs calculés selon le profil et limités au périmètre de l'utilisateur.
- Contenu : documents récents, validations en attente, activité récente, exercices à archiver (CDC section 3).
- Aucun chiffre affiché sans donnée réelle derrière.

### Lot 6.3 : Paramètres (Bloqué)

- **Informations du cabinet** (Q-19 : données officielles à fournir).
- **Paramètres de dépôt :** taille, formats.
- **Paramètres d'archivage et de notification.**
- **Droits :** `settings.manage` pour l'ensemble des paramètres ; `settings.documentary` pour les paramètres documentaires.

### Lot 6.4 : Alertes d'échéances CGA (optionnel, Bloqué)

- Échéances du 31/01, du 30/04 et du 30/06 (ARB-09).
- **Prérequis :** Q-18 (ces alertes sont-elles souhaitées ?).

---

## Phase 7 : mise en production

### Lot 7.1 : Durcissement et mise en production (Bloqué)

- Hébergement, HTTPS, configuration de production, serveur d'envoi des e-mails.
- Sauvegardes et tests de restauration.
- Antivirus.
- Files d'attente supervisées, journaux techniques.
- Performances selon la volumétrie (Q-08).
- Vérifications avant la mise en ligne : favicon, pages légales avec les textes validés par le cabinet, pages d'erreur.
- **Prérequis :** Q-03 (hébergement, stockage, sauvegardes), Q-08 (volumétrie).

---

## Hors de la version 1, sauf décision contraire

- Intégrations Google Drive, CRM, Task Flow, Compta Flow (Q-02).
- Plusieurs cabinets dans l'application : un seul pour l'instant (Q-09).
- Double authentification.
