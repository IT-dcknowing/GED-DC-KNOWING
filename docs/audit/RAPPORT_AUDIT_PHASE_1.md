# GED-DC-KNOWING : rapport d'audit, phase 1

Date : 24 novembre 2026
Statut : document de travail, aucune décision fonctionnelle n'est prise dans ce rapport. Les points marqués **Q-xx** attendent une validation.

Sources analysées (intégralement) :

| # | Document | Version / date | Emplacement |
|---|----------|----------------|-------------|
| D1 | Cahier des charges fonctionnel (CDC) | v1.1, 18/11/2026, « document de travail » | `Cahier_des_charges_GED_DC_KNOWING_v1.1.docx` (racine du projet) |
| D2 | Maquette HTML interactive autonome | « Maquette fonctionnelle version 1.1 » | `ged-dc-knowing-maquette-autonome (1).html` (fourni en pièce jointe, absent du projet) |
| D3 | Arborescence cible des dossiers partagés | « proposition du 23 octobre 2026 » | `GED_DC-KNOWING_Arborescence.html` (fourni en pièce jointe, absent du projet) |

Conventions : **INC** incohérence entre documents, **DEF** défaut constaté dans la maquette, **MAN** fonctionnalité manquante, **ENV** constat d'environnement, **Q** question à trancher.

---

## 0. Synthèse

**Verdict global.** Les trois documents décrivent bien le même système et sont globalement cohérents : même arborescence, mêmes sept profils, mêmes statuts, même identité visuelle. La maquette est fidèle au CDC sur la quasi-totalité des écrans demandés en section 11 du CDC.

**Limite majeure.** Le CDC v1.1 est un cahier des charges *de maquette* (sections 11 et 16 : « aucun backend, aucune base de données ni envoi réel »). Il ne contient pas les exigences d'une application de production : volumétrie, hébergement, sauvegarde, durées de conservation, politique de mots de passe, sessions, notifications réelles. Ces points sont listés par le CDC lui-même en section 15 comme « à confirmer ». Plusieurs d'entre eux bloquent la conception du modèle de données (Q-01 à Q-08).

**Points bloquants avant tout développement :**

1. `.env` invalide : toutes les commandes `php artisan` échouent (ENV-01).
2. Le projet n'est pas sous Git : aucun retour arrière possible (ENV-02).
3. Modèle des droits non arrêté : RBAC seul, ou RBAC plus autorisations par département, client, dossier et document (Q-01).
4. Relation entre la GED et Google Drive non définie : l'arborescence D3 est conçue pour des « dossiers partagés » Drive (Q-02).
5. Deux vocabulaires de statut coexistent sans règle de correspondance : statut de nommage (BROUILLON, VALIDE, SIGNE) et statut de workflow (6 statuts) (INC-01).

**Défauts de la maquette à ne pas reproduire** dans l'application (section 3.4) : l'archivage n'empêche pas les nouveaux dépôts, la réouverture écrase les statuts, la suppression en lot contourne la lecture seule, un brouillon ne peut jamais être soumis, et le journal plante quand un filtre ne renvoie aucun résultat.

---

## 1. Méthode

1. Lecture intégrale du CDC (extraction du texte du .docx, 16 sections, 12 règles de gestion).
2. Lecture intégrale du code de la maquette (CSS, icônes, jeu de données, application JavaScript) : chaque écran, chaque action du registre `ACTIONS`, chaque règle d'accès (`folderAccess`, `folderWritable`, `canValidateDoc`).
3. Lecture intégrale du SVG de l'arborescence (libellés, annotations, règles de classement, pied de page).
4. Confrontation des trois documents, point par point.
5. Inventaire de l'environnement en lecture seule. Rien n'a été installé, modifié ni supprimé.

Les constats sur la maquette viennent de la lecture du code, pas d'une exécution dans un navigateur : le serveur Playwright n'était pas disponible pendant l'audit. Les défauts DEF-xx sont déduits du code. Ils seront reproduits en navigateur si tu le souhaites.

---

## 2. Audit du cahier des charges (D1)

### 2.1 Objectifs (CDC section 2)

1. Centraliser les documents du cabinet et des clients dans un espace unique.
2. Reproduire une arborescence normalisée.
3. Un dossier principal unique par client, même avec plusieurs départements.
4. Séparer permanent et annuel.
5. Contrôler les accès par rôle, département, client et dossier.
6. Organiser dépôt, vérification, validation, version et archivage.
7. Tracer les opérations sensibles.

Ces objectifs sont clairs et mesurables, sauf le n°5 : la granularité des droits reste « à valider » (section 6 du CDC).

### 2.2 Modules (CDC section 3)

Onze modules : Tableau de bord, Explorateur documentaire, Clients, Départements, Dossiers permanents, Exercices annuels, Validations, Archives, Utilisateurs et rôles, Journal d'activité, Paramètres.

### 2.3 Profils (CDC sections 6 et 13)

| Rôle | Responsabilités (CDC) | Point d'attention |
|------|----------------------|-------------------|
| Super Administrateur | Paramétrage global, comptes, rôles, référentiels, supervision technique | Doit-il lire le contenu des espaces Direction et RH ? (Q-11) |
| Directeur du Cabinet | Vision transversale, indicateurs, arbitrages | Le CDC ne lui donne pas explicitement le droit de valider (Q-12) |
| Responsable GED | Organisation documentaire, contrôle du classement, anomalies, administration des archives | « Explorateur complet selon délégation » : périmètre de la délégation non défini |
| Responsable de Département | Gestion des collaborateurs de son département, clients affectés, validation de son périmètre | « Gestion des collaborateurs » : création de comptes ou simple affectation ? (Q-13) |
| Collaborateur | Dépôt, consultation, modification dans les espaces affectés | Affectation par département ou nominative par client ? (Q-14) |
| Stagiaire | Accès limité, pas de validation ni d'administration par défaut | « Dépôt limité si autorisé » : qui autorise, et à quel niveau ? |
| Auditeur / Lecteur | Consultation seule des espaces ouverts | Le téléchargement est-il autorisé ? (Q-15) |

Le CDC précise que ces rôles sont « une proposition de conception à faire confirmer ».

### 2.4 Règles de gestion RG-01 à RG-12

Elles sont claires et exploitables pour le modèle de données. Remarques :

* **RG-01** (« un département appartient à un seul cabinet ») suppose qu'il peut exister plusieurs cabinets. Faut-il prévoir le multi-cabinet ? (Q-09)
* **RG-08** (contrôle côté serveur) est fondamentale : toute règle visible dans la maquette doit être réimplémentée en Policy Laravel.
* **RG-09** ne dit pas si la modification des *métadonnées* d'un document validé crée aussi une version (INC-07).
* **RG-11 / RG-12** : le rôle qui peut confirmer et celui qui peut rouvrir ne sont pas nommés (Q-16).

### 2.5 Sécurité (CDC sections 5 et 8)

Exigences présentes : contrôle d'accès serveur, vérification extension, type MIME et cohérence, antivirus et quarantaine, non-exécution des fichiers, taille maximale configurable, authentification, chiffrement réseau, sauvegardes et tests de restauration.

Absences :

* Politique de mots de passe, verrouillage après échecs, double authentification, durée de session.
* Réinitialisation de mot de passe : dépend du canal e-mail, non confirmé.
* Chiffrement des fichiers au repos.
* Durée de conservation et immuabilité du journal d'audit.
* Protection des données personnelles : les dossiers RH et sociaux contiennent des données personnelles. Le cadre ivoirien (loi n° 2013-450 et autorité ARTCI) est à vérifier par le cabinet ; je ne présume d'aucune obligation précise.

### 2.6 Ambiguïtés, contradictions et manques du CDC

| ID | Constat | Section CDC |
|----|---------|-------------|
| CDC-01 | Le CDC décrit la maquette, pas l'application de production. Aucune exigence non fonctionnelle chiffrée : nombre d'utilisateurs, volume de documents, taille de stockage, navigateurs supportés, disponibilité. | 11, 16 |
| CDC-02 | « Accepter tous types de fichiers » puis « formats dangereux à définir » : contradiction à arbitrer. | 8 |
| CDC-03 | « Profondeur maximale de quatre niveaux, point de départ à confirmer » : la structure clients elle-même dépasse quatre niveaux si on compte depuis la racine (voir 4.3). | 4.3 |
| CDC-04 | Le workflow « pourra varier selon le type documentaire et le département » : pas de règle cible. | 7 |
| CDC-05 | « Le système signale les exercices susceptibles d'être archivés selon des critères configurables » : aucun critère n'est proposé. | 10 |
| CDC-06 | Aucune règle de clôture d'un exercice (actif vers clôturé). | 10 |
| CDC-07 | Les déplacements et restaurations doivent être journalisés, mais aucune fonction de déplacement ou de restauration n'est décrite. | 9 |
| CDC-08 | Rien sur la radiation d'un client, pourtant prévue par 99_ARCHIVES. | 4.1 |
| CDC-09 | Pas de pages légales (confidentialité, CGU) ni de pages d'erreur ; elles sont exigées par tes directives qualité. | n/a |

---

## 3. Audit de la maquette interactive (D2)

### 3.1 Inventaire des écrans

| Écran | Contenu constaté | Conformité CDC section 11 |
|-------|------------------|---------------------------|
| Connexion | Formulaire, affichage du mot de passe, « mot de passe oublié » (message seulement), 7 accès de démonstration | Conforme |
| Tableau de bord | 6 indicateurs cliquables, activité récente, derniers dépôts, répartition par département, alertes | Conforme |
| Explorateur | Arbre à gauche, liste ou grille au centre, panneau de détails masquable à droite, fil d'Ariane, recherche récursive, filtres statut, type et département, 8 tris, sélection multiple et actions en lot | Conforme, filtres incomplets (MAN-03) |
| Clients | Tableau, recherche, filtre département, création et modification, fiche en panneau latéral, accès au dossier | Conforme |
| Départements | Cartes, responsable, effectifs, clients, détail en modale | Conforme ; le bouton « Nouveau département » n'affiche qu'un message |
| Dossiers permanents | Tableau par client, sous-dossiers A1 à A4, accès | Conforme |
| Exercices annuels | Tableau, création d'exercice, proposition d'archivage | Conforme ; pas de clôture (MAN-05) |
| Validations | Onglets par statut, modale d'examen avec aperçu, prise en charge, approbation, rejet motivé ; vue « Mes dépôts » pour les profils non valideurs | Conforme |
| Archives | Exercices clôturés, proposition, confirmation avec case à cocher, réouverture motivée, accès à 99_ARCHIVES | Conforme |
| Utilisateurs et rôles | Tableau, création et modification, activation, cartes des 7 rôles avec matrice des permissions | Conforme ; pas de droits par dossier (MAN-07) |
| Journal | Filtres utilisateur, action, résultat, période ; export CSV simulé | Conforme ; limité à 60 lignes, sans pagination |
| Paramètres | Cabinet, départements, catégories, types, testeur de nommage, dépôt, notifications, archivage | Conforme |

Éléments transverses : sélecteur de profil, notifications par profil, recherche globale (touche `/`), messages temporaires (toasts), modales, panneaux latéraux, fermeture par Échap.

### 3.2 Composants identifiés (à reprendre en React)

Sidebar rétractable, barre supérieure avec fil d'Ariane, recherche globale avec résultats groupés, popovers, cartes indicateurs, tableaux avec en-tête fixe, onglets avec compteurs, badges de statut, badges de département, puces de code, modale générique, dialogue de confirmation, panneau latéral, toasts, état vide, bandeau d'information (4 variantes), zone de dépôt, étapes de contrôle avec barre de progression, aperçu simulé, historique des versions et des décisions, interrupteur, champs de formulaire, arbre de dossiers avec compteurs et verrous.

### 3.3 Navigation et parcours

* Le menu s'adapte au profil (tableau `nav` de chaque rôle) et l'accès direct à un module interdit est refusé (`go()`).
* Le parcours dépôt, examen, rejet, correction et nouvelle soumission fonctionne pour le collaborateur.
* Le parcours proposition, confirmation et réouverture fonctionne.
* Rupture de parcours : un document enregistré en brouillon ne peut jamais être soumis (DEF-01).

### 3.4 Défauts constatés dans le code de la maquette

Ces défauts n'ont pas d'importance pour une maquette, mais ils montrent des règles à définir correctement dans l'application.

| ID | Défaut | Conséquence | Règle concernée |
|----|--------|-------------|-----------------|
| DEF-01 | Aucune action « Soumettre » pour un brouillon ; la permission `submitDraft` est déclarée mais jamais utilisée. « Nouvelle version » laisse un brouillon en brouillon. | Un brouillon reste bloqué indéfiniment | CDC section 7 |
| DEF-02 | `confirmArchive` passe les documents en « Archivé » mais le dossier de l'exercice reste de type `year`, donc inscriptible. | On peut encore déposer dans un exercice archivé | RG-11 |
| DEF-03 | La réouverture remet *tous* les documents archivés au statut « Validé ». | Les statuts antérieurs (en attente, rejeté) sont perdus | RG-12 |
| DEF-04 | La suppression en lot ne vérifie ni la lecture seule ni le statut. | Suppression possible de documents archivés ou situés dans 99_ARCHIVES | RG-09, RG-11 |
| DEF-05 | La modification des métadonnées d'un document validé se fait sur place, sans nouvelle version ni renommage du fichier. | Le nom du fichier ne correspond plus aux métadonnées ; la modification n'est pas versionnée | RG-09, nommage |
| DEF-06 | `vJournal` réaffecte une constante (`const rows`) quand la liste filtrée est vide. | Erreur JavaScript : l'écran Journal ne s'affiche pas si un filtre ne renvoie rien | État vide |
| DEF-07 | Les compteurs de l'arbre comptent tous les documents, y compris ceux des espaces interdits. | Fuite d'information (nombre de documents de 00_DIRECTION visible par un auditeur) | RG-08 |
| DEF-08 | Un document déposé sans département (option « Aucun ») dans un dossier client ne peut être validé par aucun responsable de département. | Document orphelin dans le workflow | CDC section 7 |
| DEF-09 | La création de dossier ne contrôle pas la profondeur maximale. | Règle des 4 niveaux non appliquée | CDC 4.3 |
| DEF-10 | Le responsable GED peut proposer *et* confirmer le même archivage. | Pas de double contrôle (à confirmer, Q-16) | CDC section 10 |
| DEF-11 | Le nom généré au dépôt se termine toujours par `_BROUILLON` et n'est jamais mis à jour après validation. L'objet est mis en minuscules, contrairement à l'exemple `TVA-sept`. | Nommage non conforme à l'exemple de D3 | Nommage |
| DEF-12 | Arbre, lignes d'activité, alertes et cartes de département sont des `span` ou `div` cliquables, non focalisables. | Navigation au clavier impossible dans l'arbre | CDC section 12 (focus clavier) |
| DEF-13 | L'icône `copy-dummy` n'existe pas ; elle est remplacée par l'icône fichier. | Mineur | n/a |
| DEF-14 | Fermeture de balise `</section>` en double dans la branche « accès restreint » de la zone centrale. | HTML invalide (branche peu atteignable) | n/a |
| DEF-15 | Les notifications sont stockées par *rôle*, pas par utilisateur ; leurs chiffres sont écrits en dur. | À calculer réellement dans l'application | Directives (pas de faux chiffres) |

### 3.5 Incohérences dans les données de démonstration

* Le document « TVA-octobre » (CLI-0007) du stagiaire est classé dans `3_Fiscal`, alors que son dépôt est limité à `1_Pieces`. La ligne de journal LOG-010 affirme pourtant « dossier 1_Pieces ».
* Plusieurs documents ont pour valideur « Awa TRAORÉ » (Responsable GED), alors que ce rôle n'a pas le droit de valider dans la maquette.
* Le document « TVA-T3_VALIDE » (CLI-0006) a le statut « Rejeté » : nom et statut se contredisent.
* L'historique de « Liasse-fiscale-2025 » contient deux entrées v1.0.
* Les informations du cabinet (RCCM, DFE, téléphone, e-mail, 34 membres, adresse « Plateau, immeuble Alpha 2000 ») sont inventées. D3 indique « Cocody II Plateaux ». Le client fictif CLI-0007 a la même adresse que le cabinet.
* Les graphiques d'activité des départements sont des tableaux de valeurs fixes.

### 3.6 Qualité de l'interface et adaptation aux écrans

Points forts : palette conforme au CDC section 12, hiérarchie claire, états vides soignés, confirmations, toasts, panneaux latéraux en tablette et mobile, préférence « animations réduites » respectée, impression gérée.

Écarts avec tes directives non négociables, à corriger dans l'application React (la maquette n'a pas à être modifiée) :

| Directive | Constat dans la maquette | Proposition |
|-----------|-------------------------|-------------|
| Pas de tirets longs dans l'interface | Utilisés partout (« Maquette — Données fictives », libellés, messages) | Remplacer par deux-points, virgules ou retours à la ligne |
| Pas de boutons en pilule | Les boutons ont un rayon de 10 px (conforme). Les puces de catégorie et les clients cliquables de la modale Département (`tag-chip`) sont des boutons en pilule | Rayon de 8 à 10 px pour tout élément cliquable |
| Pas de décor sans valeur fonctionnelle | Cercles concentriques de l'écran de connexion, effet de soulèvement des cartes au survol | Supprimer. La texture bois est demandée par le CDC : à valider (Q-20) |
| Pas de faux chiffres | Compteurs de notifications et graphiques d'activité fixes | Tout indicateur calculé à partir de la base, ou masqué |
| Favicon | Absent (`public/favicon.ico` fait 0 octet) | Logo officiel nécessaire (Q-19) |
| Pages légales, pages d'erreur | Absentes | À créer ; contenu fourni ou validé par le cabinet |
| Mobile | Le CDC demande « priorité desktop et tablette », tes directives exigent aussi le mobile | Explorateur en panneaux successifs sur mobile, comme la maquette |

Autres remarques : les polices sont chargées depuis Google Fonts. Je recommande de les héberger dans l'application (pas d'appel externe, fonctionnement hors ligne).

---

## 4. Audit de l'arborescence documentaire (D3)

### 4.1 Structure complète

```
DC-KNOWING_GED
├── LE CABINET (fonctionnement interne)
│   ├── 00_DIRECTION                    [accès restreint]
│   │   ├── 01_Gouvernance              statuts, RCCM, agrément CGA, FDFP
│   │   ├── 02_Strategie_Seminaires
│   │   ├── 03_Comptes-rendus_Reunions
│   │   └── 04_Finances_Cabinet         compta propre, banques, budget
│   ├── 02_FORMATION_ACADEMY            FDFP, catalogue, sessions par année, PAP-GE
│   ├── 03_RH_CABINET                   [accès restreint] personnel, stagiaires, contrats, évaluations
│   ├── 04_DIGITAL_SUITE-FLOW           specs, captures, versions des applications Flow
│   ├── 05_COMMERCIAL_COMMUNICATION     offres, plaquettes, prospects, salon annuel
│   ├── 06_RESSOURCES_VEILLE            annexes fiscales, CGI, OHADA, modèles de documents
│   └── 99_ARCHIVES                     clients radiés, exercices de plus de 10 ans
└── 01_CLIENTS                          « un dossier identique par client »
    ├── _MODELE_DOSSIER_CLIENT          à copier pour chaque nouveau client
    └── CLI-0001_NOM-CLIENT             code client = Drive · CRM · Task Flow · Compta Flow
        ├── A_PERMANENT                 (mis à jour, jamais recréé)
        │   ├── A1_Juridique            statuts, RCCM, DFE, PV d'AG
        │   ├── A2_Contrat              lettre de mission, adhésion CGA
        │   ├── A3_Identifiants         régime fiscal, n° CC, n° CNPS
        │   └── A4_Banques_Contacts
        └── B_EXERCICES
            └── 2026                    un sous-dossier par exercice
                ├── 1_Pieces            ventes, achats, banque, caisse (mensuel)
                ├── 2_Comptabilite      balance, grand-livre, rapprochements
                ├── 3_Fiscal            déclarations, TEE/RME, états financiers
                ├── 4_Social_Paie       bulletins, ITS, CNPS, CMU
                ├── 5_CGA               prévisionnel, rapport, dossier de gestion
                ├── 6_Missions          financement, contentieux, audit
                └── 7_Courriers_Honoraires
```

Règles de classement : nommage `AAAAMMJJ_CodeClient_TypeDoc_Objet_Statut`, préfixes numérotés, 4 niveaux au maximum, un seul exemplaire par document, aucun dossier de niveau 1 ou 2 sans validation, rien dans « Mon Drive » personnel, revue mensuelle par le responsable GED. Calendrier CGA : prévisionnel au 31/01, états financiers au 30/04, dossier de gestion au 30/06.

### 4.2 Logique de classement

* Premier axe : cabinet ou client.
* Côté client, deuxième axe : permanent (stable) ou annuel (par exercice).
* Côté annuel, troisième axe : rubrique métier (7 rubriques fixes et ordonnées).
* Le département n'est **pas** un axe de classement : c'est cohérent avec RG-03 et RG-07 (un dossier partagé entre départements). Le département devient une métadonnée et un critère de droit.

### 4.3 Problèmes identifiés

| ID | Problème |
|----|----------|
| ARB-01 | **Profondeur.** `01_CLIENTS / CLI-0001 / B_EXERCICES / 2026 / 1_Pieces` fait 5 niveaux ; 6 si on compte la racine. La règle des « 4 niveaux » n'est respectée que si on commence à compter sous le dossier client, ou si elle ne vise que les dossiers *créés par les utilisateurs* sous les rubriques. À trancher (Q-05). |
| ARB-02 | **Deux emplacements d'archive.** Le CDC archive un exercice sur place (lecture seule dans `B_EXERCICES/AAAA`). D3 place les « exercices de plus de 10 ans » dans `99_ARCHIVES`. Il manque la règle de passage de l'un à l'autre (Q-17). |
| ARB-03 | **Clients radiés.** Rien n'indique si le code client est conservé. La maquette leur attribue un code `ARC-xxxx`, ce qui casse la cohérence avec CRM et Compta Flow. |
| ARB-04 | **Sous-dossiers non définis.** Seul 00_DIRECTION a des sous-dossiers nommés. Pour 02 à 06 et 99, D3 donne une description (« FDFP, catalogue… »), pas des noms de dossiers. La maquette a inventé `01_FDFP`, `02_Catalogue`, `01_Clients_Radies`, etc., alors que le CDC demande de ne pas réinventer les libellés (Q-06). |
| ARB-05 | **Numérotation.** 01_CLIENTS est dessiné à part, mais son préfixe le place entre 00 et 02 : l'ordre réel de l'arbre est 00, 01, 02… 99. C'est cohérent ; à confirmer pour l'affichage. |
| ARB-06 | **Le contenu attendu de chaque rubrique** (ex. « TEE/RME » dans 3_Fiscal) n'est relié à aucun type documentaire. Rien n'empêche de classer une déclaration dans 1_Pieces (Q-07). |
| ARB-07 | **Doublons.** « Un seul exemplaire par document » suppose un contrôle : empreinte du fichier ou règle métier. |
| ARB-08 | **Logique Google Drive.** « Rien ne reste dans Mon Drive », « dossiers partagés », « code client = Drive » : D3 a été pensé pour Google Drive. La GED remplace-t-elle Drive, le complète-t-elle ou s'y synchronise-t-elle ? (Q-02) |
| ARB-09 | **Calendrier CGA.** Les échéances 31/01, 30/04 et 30/06 figurent dans D3 mais nulle part dans le CDC ni la maquette. Faut-il des alertes d'échéance ? (Q-18) |
| ARB-10 | **Nom de la racine.** « DC-KNOWING_GED » dans D3, « GED DC-KNOWING » dans la maquette. Mineur. |

### 4.4 Représentation dans l'application

Recommandation, à valider :

* L'arborescence est **logique et stockée en base** : table `folders` avec parent, chemin matérialisé, profondeur, nature (espace, client, modèle, permanent, exercice, rubrique, libre), drapeaux « restreint » et « lecture seule ».
* Les fichiers sont stockés sur un disque **privé** sous un identifiant technique (UUID), jamais sous leur nom ni dans `public/`. Leur téléchargement passe par un contrôleur qui vérifie les droits (RG-08).
* La structure des clients est générée depuis un **modèle en base** (équivalent de `_MODELE_DOSSIER_CLIENT`). Les dossiers structurels (espaces, A_PERMANENT, B_EXERCICES, rubriques) sont verrouillés contre le renommage et la suppression.
* Les exercices sont une entité à part entière (client, année, statut, dates), liée à leur dossier.

### 4.5 Besoins en droits d'accès

| Niveau | Besoin exprimé ou implicite |
|--------|-----------------------------|
| Espace | 00_DIRECTION, 03_RH_CABINET, 99_ARCHIVES restreints (D3, CDC) |
| Client | Visible par les départements qui le suivent (RG-07) ; exceptions nominatives (auditeur, stagiaire) |
| Dossier | Stagiaire limité à certains dossiers (ex. 1_Pieces) ; exercice archivé en lecture seule |
| Document | Le CDC cite le niveau « document » (section 6), sans exemple |
| Action | Déposer, modifier, supprimer, valider, proposer, confirmer, rouvrir, télécharger, créer un dossier |

Il faut donc un modèle **RBAC** (rôles, via spatie/laravel-permission déjà installé) **plus des autorisations par périmètre** stockées en base et attribuées par utilisateur. La maquette code ces périmètres en dur dans les rôles (ex. l'auditeur voit CLI-0004 et CLI-0006) ; ils devront être paramétrables par utilisateur.

---

## 5. Audit croisé

### 5.1 Éléments conformes entre les trois documents

* Arborescence : espaces 00 à 06 et 99, 01_CLIENTS, modèle, structure A et B, 4 sous-dossiers permanents, 7 rubriques annuelles : identiques dans D1, D2 et D3.
* Espaces restreints : 00_DIRECTION et 03_RH_CABINET (D3), plus 99_ARCHIVES restreint dans la maquette (choix de D2, à confirmer).
* Règle de nommage et exemple identiques.
* Unicité du dossier client et partage entre départements (RG-03, RG-07) : respectés par la maquette.
* Les 7 profils, les 6 statuts et le workflow de validation sont identiques entre CDC et maquette.
* Archivage manuel, lecture seule, réouverture motivée : conformes.
* Palette (8 couleurs du CDC section 12) : exactement reprise par la maquette ; elle vient de D3.

### 5.2 Prévu au CDC, absent ou incomplet dans la maquette

| ID | Fonction | Référence CDC |
|----|----------|---------------|
| MAN-01 | Soumettre un brouillon à validation | 7 |
| MAN-02 | Déplacer un document (et le journaliser) | 9 |
| MAN-03 | Filtres par client, exercice, dossier et période dans l'explorateur | 9 |
| MAN-04 | Restaurer une suppression logique (corbeille) | 9 |
| MAN-05 | Clôturer un exercice ; critères configurables de signalement | 10 |
| MAN-06 | Workflow variable selon le type documentaire (le paramètre « validation requise » existe mais n'est pas appliqué) | 7 |
| MAN-07 | Autorisations par client, dossier, sous-dossier et document, par utilisateur | 6 |
| MAN-08 | Gestion des collaborateurs par le responsable de département | 6 |
| MAN-09 | Suivi des anomalies de classement et revue mensuelle (seulement évoqués dans des alertes) | 4.3, 6 |
| MAN-10 | Dépôt multiple (présent comme paramètre, pas comme fonction) | 8 |
| MAN-11 | Gestion de la quarantaine (fichiers suspects) | 8 |
| MAN-12 | Contrôle de la profondeur maximale | 4.3 |

### 5.3 Présent dans la maquette, non prévu au CDC

À valider : garder, adapter ou retirer.

| Élément | Avis |
|---------|------|
| Centre de notifications | Utile ; canal à confirmer (CDC section 15) |
| Actions en lot (valider, télécharger, supprimer) | Utile ; règles de sécurité à définir (DEF-04) |
| Vue grille | Confort ; faible coût |
| « Prendre en charge » (passage en vérification) | Correspond au statut « En cours de vérification » du CDC |
| Validation des documents internes réservée à la direction | Règle inventée par la maquette (Q-12) |
| Directeur autorisé à valider tous les documents | Non prévu au CDC (Q-12) |
| Responsable GED autorisé à voir Direction et RH | Non prévu au CDC (Q-11) |
| Formats bloqués (.exe, .bat, .sh, .msi, .cmd) | Proposition raisonnable, à valider (CDC-02) |
| Liste des 12 types documentaires (DECL, FACT, BIL…) | Inventée, sauf DECL (Q-07) |
| 7 catégories documentaires | Inventées (Q-07) |
| Testeur de règle de nommage | Utile pour le responsable GED |
| Paramètres « informations du cabinet » | Les valeurs affichées sont fictives |
| Export CSV du journal | Non demandé ; maatwebsite/excel est déjà installé |
| Durée « avant proposition d'archivage » fixée à 10 ans | Confond archivage d'exercice et transfert dans 99_ARCHIVES (ARB-02) |

### 5.4 Incohérences entre l'arborescence et l'application

| ID | Incohérence | Proposition à valider |
|----|-------------|-----------------------|
| INC-01 | Le statut de nommage (BROUILLON, VALIDE, SIGNE) et le statut de workflow (Brouillon, En attente, En cours de vérification, Validé, Rejeté, Archivé) ne correspondent pas. Que devient le suffixe du nom quand le statut change ? Que signifie SIGNE dans le workflow ? | Le nom de fichier est *calculé* à l'affichage et au téléchargement à partir des métadonnées ; le statut de nommage dérive du workflow (Validé donne VALIDE ; SIGNE est un attribut « document signé » saisi par l'utilisateur). |
| INC-02 | La règle de nommage impose un `CodeClient` ; les documents internes n'en ont pas. La maquette utilise « DCK ». | Code d'espace pour les documents internes (ex. `DCK` ou `DIR`, `RH`…) ; à fixer. |
| INC-03 | Profondeur de 4 niveaux contre structure client à 5 niveaux (ARB-01). | Compter à partir du dossier client, ou limiter seulement les dossiers libres. |
| INC-04 | Archivage sur place (CDC) contre transfert dans 99_ARCHIVES (D3) (ARB-02). | Deux étapes : archivage sur place à la clôture, puis transfert (ou simple marquage) au-delà de la durée légale. |
| INC-05 | Sous-dossiers des espaces 02 à 06 et 99 non nommés dans D3 mais inventés dans la maquette (ARB-04). | Faire valider une liste de noms. |
| INC-06 | Codes `ARC-xxxx` des clients radiés contre code client unique entre outils (ARB-03). | Conserver le code CLI d'origine et ajouter un statut « radié ». |
| INC-07 | RG-09 (nouvelle version) contre modification sur place des métadonnées dans la maquette (DEF-05). | Métadonnées modifiables avec historique ; nouvelle version seulement pour un nouveau fichier. À valider. |
| INC-08 | Adresse du cabinet : « Cocody II Plateaux » (D3) contre « Plateau, immeuble Alpha 2000 » (maquette). | Utiliser les données officielles fournies par le cabinet. |
| INC-09 | Logo : D3 montre le logo « DC-KNOWING » (O doré) avec la signature « The bespoke partner » ; la maquette utilise un monogramme « DC ». | Logo haute définition à fournir (CDC section 15). |
| INC-10 | Typographie : titres en serif (DejaVu Serif) dans D3, sans-serif dans la maquette, conformément au CDC section 12. | Suivre le CDC (sans-serif) ; à confirmer si une charte officielle existe. |

---

## 6. Tableau consolidé des points à corriger

Priorité : **P1** bloque la conception ou le démarrage ; **P2** à trancher avant le module concerné ; **P3** amélioration.

| ID | Sujet | Priorité | Décideur | Action proposée |
|----|-------|----------|----------|-----------------|
| ENV-01 | `.env` invalide | P1 | Toi | Mettre `APP_NAME` entre guillemets |
| ENV-02 | Projet hors Git | P1 | Toi | `git init` et premier commit de l'état actuel |
| Q-01 | Modèle des droits | P1 | DC-KNOWING | RBAC plus périmètres par utilisateur (4.5) |
| Q-02 | Relation avec Google Drive | P1 | DC-KNOWING | GED autonome en v1, intégrations plus tard |
| INC-01 | Statut de nommage contre statut de workflow | P1 | DC-KNOWING | Nom calculé (5.4) |
| Q-03 | Hébergement et stockage de production | P1 | DC-KNOWING | Détermine l'antivirus, les sauvegardes, la taille maximale |
| INC-03 / Q-05 | Profondeur maximale | P2 | DC-KNOWING | Compter depuis le dossier client |
| INC-04 / Q-17 | Archive sur place ou 99_ARCHIVES | P2 | DC-KNOWING | Deux étapes |
| INC-05 / Q-06 | Noms des sous-dossiers internes | P2 | DC-KNOWING | Liste à valider |
| Q-07 | Types et catégories documentaires | P2 | DC-KNOWING | Liste à valider, reliée aux rubriques |
| MAN-01 | Soumission d'un brouillon | P2 | n/a | À implémenter |
| MAN-05 / CDC-06 | Clôture d'exercice | P2 | DC-KNOWING | Qui clôture, et quand ? |
| DEF-02, 03, 04 | Lecture seule réellement appliquée | P2 | n/a | Policies serveur |
| DEF-07 | Fuite des compteurs | P2 | n/a | Compter uniquement les documents autorisés |
| Q-16 | Double contrôle à l'archivage | P2 | DC-KNOWING | Proposant différent du confirmateur |
| INC-08, 09 / Q-19 | Données officielles du cabinet et logo | P2 | DC-KNOWING | À fournir |
| Directives | Pages légales, favicon, pages d'erreur | P2 | DC-KNOWING pour le contenu | Pages créées, textes validés par le cabinet |
| DEF-12 | Accessibilité clavier | P3 | n/a | Composants React accessibles |

---

## 7. Fonctionnalités : validées, manquantes, à clarifier

**Validées** (CDC, maquette et arborescence d'accord) : authentification ; tableau de bord par profil ; explorateur à 3 zones ; arbre de référence ; dossier client unique partagé ; modèle de dossier client ; dossiers permanents ; exercices annuels à 7 rubriques ; dépôt avec métadonnées ; contrôles de dépôt ; aperçu des formats compatibles et téléchargement des autres ; workflow à 6 statuts ; rejet motivé ; versionnage ; archivage manuel en lecture seule ; réouverture motivée ; journal filtrable ; gestion des utilisateurs ; 7 profils ; recherche par nom, mot-clé et code client ; tri ; fil d'Ariane ; palette.

**Manquantes** (exigées ou nécessaires, non représentées) : MAN-01 à MAN-12 ; réinitialisation du mot de passe ; profil utilisateur (changer son mot de passe) ; radiation d'un client ; pages légales ; pages d'erreur 403, 404, 419, 500 ; favicon.

**À clarifier** : voir la section 12 (Q-01 à Q-20).

---

## 8. Environnement technique (constaté le 24/11/2026)

### 8.1 Outils

| Élément | Constat | Avis |
|---------|---------|------|
| OS | Windows 10 Home, Laragon | OK pour le développement |
| PHP | 8.3.30 (ZTS, x64) | OK (Laravel 13 exige PHP 8.3 ou plus) |
| Composer | 2.9.4 | OK. `composer -V` lancé via `composer.bat` est resté bloqué dans le terminal non interactif ; via le `.phar`, il répond |
| Laravel | 13.43.0 | Version récente |
| MySQL | 8.4.3, `utf8mb4` / `utf8mb4_0900_ai_ci`, mode strict | OK |
| Node.js / npm | 24.18.0 / 11.16.0 | OK |
| Git | 2.45.1 installé, **projet non versionné** | Voir ENV-02 |

### 8.2 Extensions PHP

Présentes : bcmath, ctype, curl, dom, exif, fileinfo (détection du type MIME réel), gd, intl, mbstring, openssl, pdo_mysql, pdo_sqlite, sodium, tokenizer, xml, zip, OPcache. **Toutes les extensions requises par Laravel et par les paquets installés sont présentes.**

Absentes, non bloquantes : `imagick` (vignettes ; gd suffit au départ), `redis` (inutile : cache, sessions et files d'attente sont en base).

Réglages PHP (`php.ini` de Laragon) : `upload_max_filesize=2G`, `post_max_size=2G`, `memory_limit=512M`, `max_execution_time=0`. Suffisant en développement. En production, à aligner sur la taille maximale retenue (Q-04).

### 8.3 Projet Laravel

* Squelette Laravel 13 presque vierge : un seul modèle (`User`), aucun contrôleur métier, route web `welcome`, route API `/api/user` protégée par Sanctum.
* `bootstrap/app.php` : routes API activées, erreurs JSON pour `api/*`. Le middleware Sanctum « stateful » (authentification SPA par cookie) n'est **pas** encore configuré.
* Paquets ajoutés le 23/11 :

| Paquet | Version | Usage prévu | Remarque |
|--------|---------|-------------|----------|
| laravel/sanctum | 4.5.0 | Authentification API / SPA | Migration publiée |
| spatie/laravel-permission | 8.0.0 (version figée) | Rôles et permissions | Config et migrations **non publiées** |
| spatie/laravel-activitylog | 4.12.3 (version figée) | Journal d'activité | Config et migrations **non publiées** |
| maatwebsite/excel | 4.0.7 (avec phpspreadsheet 5.11) | Exports | Non exigé par le CDC |
| barryvdh/laravel-dompdf | 3.1.2 | PDF | Non exigé par le CDC |

* Frontend : Vite 8, Tailwind 4, `laravel-vite-plugin` 3.1, police Instrument Sans (Bunny Fonts). **React absent**, `node_modules` absent. `.npmrc` contient `ignore-scripts=true` (bonne pratique de sécurité, je la garde).
* `CLAUDE.md` et `AGENTS.md` (identiques) demandent d'installer **Laravel Boost** avant toute modification. Je ne l'ai pas fait : c'est une installation, elle attend ton accord (Q-21).

### 8.4 Base de données

* La base `ged-dc-knowing` existe dans MySQL et est **vide** (0 table).
* Les migrations ont été exécutées sur **SQLite** (`database/database.sqlite`, 11 tables, 4 migrations), probablement avant le passage à MySQL dans `.env`.

### 8.5 Anomalies d'environnement

| ID | Anomalie | Impact | Correction proposée (non appliquée) |
|----|----------|--------|-------------------------------------|
| ENV-01 | `.env` : `APP_NAME=GED DC Knowing` sans guillemets ; le fichier a été modifié le 24/11 à 09:41 | **Bloquant** : `php artisan` refuse de démarrer (« Encountered unexpected whitespace ») | `APP_NAME="GED DC-KNOWING"` |
| ENV-02 | Pas de dépôt Git | Aucun historique, aucun retour arrière | `git init`, vérifier `.gitignore` (`.env` déjà exclu), premier commit |
| ENV-03 | Deux processus `mysqld` sur le même dossier de données ; seul le PID 9304 écoute sur le port 3306. Ce matin, l'initialisation d'InnoDB a pris 10 minutes (08:35 à 08:45), signe probable d'un verrou tenu par le processus 4072 | Lenteur au démarrage, risque sur les données | Arrêter tous les services depuis Laragon, vérifier qu'aucun `mysqld` ne reste actif, puis redémarrer |
| ENV-04 | `APP_URL=http://localhost:8004`, mais rien n'écoute sur 8004 ; Apache écoute sur le port 80 (Laragon fournit normalement `http://ged-dc-knowing.test`) | L'authentification SPA par cookie exige une URL de développement stable | Choisir une URL (Q-22) |
| ENV-05 | Migrations jouées sur SQLite et non sur MySQL | Aucune donnée à perdre (MySQL vide) | Lancer `php artisan migrate` sur MySQL ; garder le fichier SQLite tant que tu n'as pas décidé |
| ENV-06 | `public/favicon.ico` vide (0 octet) | Pas de favicon | Logo officiel |
| ENV-07 | Avertissement MySQL : données ICU absentes (expressions régulières) | Les fonctions `REGEXP` peuvent échouer ; ne pas en dépendre | Aucune pour l'instant |
| ENV-08 | `REDIS_PASSWORD` et `MAIL_PASSWORD` valent `null` sous forme de texte | Sans effet tant que Redis et le mail ne sont pas utilisés | Rien à faire |

Aucun antivirus utilisable par l'application (ClamAV) n'est installé, et aucun convertisseur bureautique (LibreOffice) pour les aperçus Word ou Excel. Les deux dépendent de l'hébergement de production (Q-03).

---

## 9. Architecture cible proposée

### 9.1 Choix d'intégration React et Laravel

| Option | Description | Avantages | Inconvénients |
|--------|-------------|-----------|---------------|
| **A (recommandée)** | Application React (SPA) compilée par le Vite de Laravel, servie par une page Blade unique. Elle ne parle au backend que par `/api/v1`. Authentification Sanctum par cookie de session (même domaine). | Même origine, donc pas de CORS. Cookie `HttpOnly` et protection CSRF, aucun jeton dans le navigateur. Un seul déploiement. Vite et Tailwind déjà en place. | Front et back dans le même dépôt (séparés par dossiers et par contrat d'API) |
| B | Frontend dans un dossier `frontend/` avec son propre Vite, en proxy vers Laravel en développement | Séparation physique plus nette | Deux outillages, configuration CORS, cookies et domaines plus délicate, deux déploiements |
| C | Inertia.js | Productif | Pas d'API REST ; contraire à ta demande |

La séparation que tu demandes est garantie par une règle : **le frontend ne reçoit aucune donnée de Blade, tout passe par l'API REST documentée.**

### 9.2 Pile technique proposée

**Backend** : Laravel 13, Sanctum (SPA stateful), spatie/laravel-permission (rôles), tables de périmètres propres à l'application (département, client, dossier), spatie/laravel-activitylog ou table d'audit dédiée en ajout seul (Q-23), Form Requests, Policies (RG-08), API Resources, Enums PHP pour les statuts, files d'attente `database` (contrôles de fichiers, antivirus, aperçus), disque privé `documents`, empreinte SHA-256 de chaque fichier (doublons et intégrité), tests PHPUnit.

**Frontend** : React 19, TypeScript (Q-24), React Router, TanStack Query (données serveur, cache), Axios (gère le jeton CSRF de Sanctum), React Hook Form et Zod (formulaires et validation), lucide-react (icônes Lucide, comme le CDC le demande), Tailwind 4 avec les jetons de couleur du CDC, polices Inter et Manrope hébergées localement (@fontsource), Vitest et Testing Library.

### 9.3 Arborescence du code

```
app/
  Enums/                    DocumentStatus, ExerciseStatus, FolderKind…
  Models/                   User, Department, Client, Folder, Exercise, Document, DocumentVersion…
  Http/
    Controllers/Api/V1/     contrôleurs minces, un par ressource
    Requests/               validation des entrées
    Resources/              format JSON des réponses
  Policies/                 contrôle d'accès (RG-08)
  Services/                 logique métier : dépôt, nommage, workflow, archivage, arbre
  Jobs/                     analyse de fichier, antivirus, génération d'aperçu
  Notifications/
database/
  migrations/  seeders/     données de démonstration séparées des référentiels
routes/
  api.php                   /api/v1/...
  web.php                   page unique de la SPA (toutes les routes sauf api et sanctum)
resources/
  views/app.blade.php       page d'accueil de la SPA
  js/
    main.tsx
    app/                    routeur, fournisseurs, garde d'authentification
    api/                    client Axios, appels par ressource, types de l'API
    components/ui/          Button, Modal, Table, Badge, Toast, EmptyState…
    components/layout/      Sidebar, Topbar, Breadcrumbs
    features/               auth, dashboard, explorer, clients, departments, permanent,
                            exercises, validations, archives, users, journal, settings, legal
    hooks/  lib/  styles/   jetons de design, utilitaires
storage/app/private/documents/   fichiers, hors de public/
docs/                       audit, décisions, spécification de l'API
```

### 9.4 Modèle de données (esquisse, à confirmer après les réponses aux questions)

`departments`, `users`, `department_user`, `clients` (code unique, statut actif ou radié), `client_department`, `folders` (parent, chemin, profondeur, nature, restreint, lecture seule, client, exercice), `exercises` (client, année, statut, dates), `archive_requests` (proposition, confirmation, réouverture, motif, auteurs), `document_types`, `document_categories`, `documents` (dossier, client, département, type, date, statut, version courante, signé, supprimé logiquement), `document_versions` (fichier, empreinte, type MIME, taille, auteur, note), `document_decisions` (action, auteur, date, motif), `access_grants` (utilisateur, portée, droits), `notifications`, `activity_log`, `settings`. Plus les tables de spatie/permission.

---

## 10. Plan d'installation et de configuration

Rien de ce qui suit n'a été exécuté. Chaque étape attend ton accord ; les étapes marquées « modification » touchent un fichier existant.

| # | Action | Nature | Réversible |
|---|--------|--------|------------|
| 1 | `git init`, vérifier `.gitignore`, premier commit de l'état actuel | Ajout | Oui |
| 2 | Corriger `APP_NAME` dans `.env` ; fixer `APP_URL` selon Q-22 | Modification | Oui (après étape 1, `.env` étant hors Git : copie de sauvegarde avant) |
| 3 | Arrêter le `mysqld` orphelin depuis Laragon (ENV-03) | Action système, faite par toi | n/a |
| 4 | Laravel Boost selon `CLAUDE.md` (Q-21) : `composer require laravel/boost --dev` puis `php artisan boost:install`. **Réécrit `CLAUDE.md` et `AGENTS.md`** | Ajout et modification | Oui via Git |
| 5 | Publier la config et les migrations de spatie/permission et activitylog ; `php artisan migrate` sur MySQL (base vide) | Ajout | Oui |
| 6 | `npm install` des dépendances existantes, puis ajout de React, TypeScript et des bibliothèques de 9.2 | Ajout (`package.json`) | Oui |
| 7 | `vite.config.js` : plugin React, point d'entrée `resources/js/main.tsx`, polices locales à la place de Bunny Fonts | Modification | Oui |
| 8 | `tsconfig.json`, jetons de couleur Tailwind dans `resources/css/app.css` | Ajout et modification | Oui |
| 9 | Page `app.blade.php` et route de la SPA ; `welcome.blade.php` conservé jusqu'à ta décision | Ajout | Oui |
| 10 | Sanctum en mode SPA : `statefulApi()` dans `bootstrap/app.php`, `SANCTUM_STATEFUL_DOMAINS` et `SESSION_DOMAIN` dans `.env` | Modification | Oui |
| 11 | Route `/api/v1/health` et page React minimale qui l'interroge, pour vérifier la chaîne complète | Ajout | Oui |
| 12 | Vérification : `php artisan test`, `npm run build`, chargement de la page, console du navigateur sans erreur, appel API réussi | Contrôle | n/a |

Aucune fonctionnalité métier n'est développée à cette étape.

---

## 11. Feuille de route

| Phase | Contenu | Condition de démarrage |
|-------|---------|------------------------|
| 0 | Décisions P1, environnement (section 10) | Réponses à Q-01, Q-02, Q-21 à Q-24 |
| 1 | Socle : authentification (connexion, déconnexion, mot de passe), mise en page, composants d'interface, pages d'erreur, pages légales (structure), utilisateurs, rôles, départements | Phase 0 terminée |
| 2 | Référentiels : clients, modèle de dossier, arbre des dossiers, exercices, droits par périmètre | Q-05, Q-06, Q-09 |
| 3 | Documents : dépôt sécurisé, stockage, nommage, versions, aperçu, téléchargement, explorateur, recherche et filtres | Q-03, Q-04, Q-07, INC-01 |
| 4 | Workflow de validation et notifications internes | Q-12, Q-14 |
| 5 | Archivage, réouverture, 99_ARCHIVES, radiation des clients | Q-16, Q-17 |
| 6 | Journal d'audit, tableau de bord calculé, paramètres | Q-23 |
| 7 | Durcissement : antivirus, sauvegardes, performance, accessibilité, tests sur les trois tailles d'écran, préparation de la mise en production | Q-03 |

Chaque phase se termine par le contrôle qualité défini dans tes directives (section 5) avant d'être déclarée terminée.

---

## 12. Décisions à prendre

### Fonctionnelles (à faire valider par DC-KNOWING)

* **Q-01** Granularité des droits : rôle seul, ou rôle plus autorisations par département, client, dossier et document attribuées par utilisateur ?
* **Q-02** La GED remplace-t-elle Google Drive, le complète-t-elle, ou doit-elle s'y synchroniser ? Quelles intégrations (Drive, CRM, Task Flow, Compta Flow) sont prévues en v1 ?
* **Q-03** Hébergement de production (serveur du cabinet, VPS, cloud), stockage, sauvegardes, antivirus.
* **Q-04** Taille maximale par fichier et liste des formats interdits.
* **Q-05** Point de départ du calcul des 4 niveaux.
* **Q-06** Noms définitifs des sous-dossiers des espaces 02 à 06 et 99_ARCHIVES.
* **Q-07** Liste des types documentaires (codes TypeDoc), des catégories, et leur lien avec les rubriques ; types soumis à validation.
* **Q-08** Volumétrie : nombre d'utilisateurs, de clients, de documents par an.
* **Q-09** Un seul cabinet, ou plusieurs (RG-01) ?
* **Q-10** Exercices : toujours l'année civile ? Qui crée l'exercice N+1, et quand ?
* **Q-11** Le Super Administrateur et le Responsable GED doivent-ils voir le contenu de 00_DIRECTION et 03_RH_CABINET ?
* **Q-12** Qui valide : le responsable du département indiqué sur le document, celui du client, le directeur ? Qui valide les documents internes ? Un valideur peut-il valider son propre dépôt ?
* **Q-13** Le responsable de département crée-t-il des comptes, ou affecte-t-il seulement des collaborateurs existants ?
* **Q-14** Un collaborateur voit-il tous les clients de son département, ou seulement ceux qui lui sont affectés ?
* **Q-15** L'auditeur peut-il télécharger ?
* **Q-16** Qui confirme un archivage et qui peut rouvrir ? Le proposant peut-il confirmer sa propre proposition ?
* **Q-17** Règle de transfert vers 99_ARCHIVES (durée, déplacement réel ou marquage) ; durées légales de conservation.
* **Q-18** Faut-il des alertes sur les échéances CGA (31/01, 30/04, 30/06) ?
* **Q-19** Logo haute définition, données officielles du cabinet, domaine e-mail des comptes, textes des pages légales.
* **Q-20** Garder la texture bois discrète des panneaux sombres (CDC) malgré la directive « pas de décor sans valeur » ?

### Techniques (à trancher par toi)

* **Q-21** Installer Laravel Boost comme le demande `CLAUDE.md` (cela réécrit `CLAUDE.md` et `AGENTS.md`) ?
* **Q-22** URL de développement : `http://ged-dc-knowing.test` (vhost Laragon) ou `php artisan serve` sur `localhost:8004` ?
* **Q-23** Journal d'audit : spatie/activitylog (installé) ou table dédiée en ajout seul (plus adaptée à un journal infalsifiable) ?
* **Q-24** TypeScript côté React (recommandé) ou JavaScript ?
* **Q-25** Garder maatwebsite/excel et dompdf, installés mais non exigés par le CDC ?
* **Q-26** Que faire de `database/database.sqlite` une fois MySQL en place ?
