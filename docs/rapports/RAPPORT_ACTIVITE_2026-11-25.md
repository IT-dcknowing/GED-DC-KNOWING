# GED-DC-KNOWING : rapport d'activité

| | |
|---|---|
| **Projet** | GED-DC-KNOWING, gestion électronique des documents du cabinet DC-KNOWING |
| **Date** | 25 novembre 2026 |
| **Fonctionnalités livrées** | Utilisateurs et rôles (lot 1.2), Départements (lot 1.3), Clients (lot 2.1) |
| **Statut** | Développées, testées et publiées sur GitHub |

## 1. Synthèse

Trois modules sont terminés :

- **Utilisateurs et rôles** : l'administrateur gère les comptes, les rôles et les accès depuis un écran unique, sans redévelopper l'API d'administration déjà livrée avec l'authentification.
- **Départements** : le cabinet crée ses départements, désigne un responsable et consulte les collaborateurs rattachés. Les droits sont appliqués par le serveur, selon le rôle et le périmètre.
- **Clients** : le cabinet tient le référentiel des clients et les rattache à un ou plusieurs départements. Le code `CLI-0001` est généré par le serveur et reste définitif ; les rôles ne voient que les clients de leur périmètre.

Le socle de la phase 1 et le premier référentiel de la phase 2 sont donc livrés. Les tests automatiques du serveur et des écrans sont tous réussis, et la collection Postman a été rejouée sur l'ensemble des fonctionnalités disponibles.

## 2. Ce qui a été réalisé

### 2.1 Utilisateurs et rôles (lot 1.2)

| Fonction | Description |
|----------|-------------|
| **Liste des comptes** | Recherche, filtres et pagination. La recherche traite « % » et « _ » comme des caractères ordinaires (A2). |
| **Création** | Compte créé par l'administrateur avec un mot de passe temporaire affiché une seule fois. Le changement est obligatoire à la première connexion. |
| **Modification** | Nom, adresse e-mail, rôle et département. Un administrateur ne peut pas modifier son propre rôle (A1) : le serveur refuse et l'écran explique pourquoi. |
| **Activation et désactivation** | Un compte désactivé ne peut plus se connecter ; ses sessions sont fermées immédiatement. |
| **Nouveau mot de passe temporaire** | Généré par l'administrateur, affiché une seule fois, à changer à la connexion suivante. |
| **Déverrouillage** | Un compte bloqué après cinq échecs peut être débloqué sans attendre la fin du délai. |
| **Indicateur de verrouillage** | Chaque compte affiche son état de verrouillage, sans état global (A3). |
| **Traçabilité** | L'auteur et la date de création du compte sont affichés (A4). |
| **Cartes des rôles** | Les 7 rôles sont présentés avec leur description, leurs permissions réellement appliquées et leur nombre de comptes, accompagnés de la mention « Répartition provisoire ». |

### 2.2 Départements (lot 1.3)

| Fonction | Description |
|----------|-------------|
| **Consultation (D1)** | Super Administrateur, Directeur et Responsable GED voient tous les départements ; le Responsable de Département ne voit que le sien ; les autres rôles sont refusés. |
| **Gestion (D2)** | Création, modification, activation et désactivation réservées à la permission `departments.manage` (Super Administrateur). |
| **Code (D7)** | 2 à 20 caractères, lettres majuscules, chiffres et tirets, unique et non modifiable après la création. |
| **Responsable (D4)** | Compte actif, de rôle « Responsable de Département », déjà rattaché au département et ne dirigeant aucun autre département. La désignation est retirée automatiquement, et journalisée, si le compte est désactivé, change de rôle ou de département. |
| **Collaborateurs (D5)** | Consultation seule ; le rattachement se fait dans « Utilisateurs et rôles ». |
| **Désactivation (D6)** | Refusée tant que des comptes actifs sont rattachés. Aucune suppression : le département est conservé et peut être réactivé. |
| **Un seul département par compte (D3)** | Le rattachement utilise `users.department_id`, sans table de liaison. |
| **Journal d'audit** | Création, modification, changement de responsable, désactivation, réactivation et retrait automatique de la désignation. |

### 2.3 Clients (lot 2.1)

| Fonction | Description |
|----------|-------------|
| **Champs obligatoires (C1)** | Dénomination de 3 à 160 caractères et au moins un département de suivi. Les autres champs restent facultatifs. La dénomination est enregistrée en majuscules. |
| **Code (C2, C4)** | Généré par le serveur au format `CLI-0001`, refusé en entrée, jamais modifiable, conservé après une radiation. |
| **Départements associés (RG-02, RG-07)** | Un client est suivi par un ou plusieurs départements ; le même dossier est partagé. |
| **Visibilité (C3, Q-14 provisoire)** | Super Administrateur, Directeur et Responsable GED voient tout le cabinet ; Responsable de Département et Collaborateur voient les clients de leur département ; Stagiaire et Auditeur n'en voient aucun avant le lot 2.4. |
| **Recherche et filtre** | Recherche littérale sur le nom, le code, le secteur et le contact ; filtre par département ; pagination. |
| **Fiche client** | Forme juridique, régime fiscal, RCCM, DFÉ, adresse, téléphone, e-mail, contact dirigeant, départements associés, date de création et auteur. |
| **Aucune suppression** | Un client sera radié au lot 5.2 ; aucune route de suppression n'existe. |
| **Journal d'audit** | Création (`admin.client.created`) et modification (`admin.client.updated`), avec l'auteur, le client et les changements. |
| **Compteurs** | Le nombre de documents et la dernière activité restent à « — » tant que le module Documents n'existe pas : aucun chiffre simulé. |

## 3. Écrans réalisés

| Écran | Description |
|-------|-------------|
| **Utilisateurs et rôles** | Tableau des comptes avec recherche, filtres, indicateur de verrouillage et actions. Fenêtres de création, de modification, de mot de passe temporaire et de détail. Cartes des 7 rôles avec la matrice des permissions. |
| **Départements** | Cartes accessibles au clavier, état actif ou désactivé, responsable et nombre de collaborateurs. Fenêtre de détail avec la liste des membres, formulaire de création et de modification, confirmation avant désactivation. |
| **Clients** | Tableau Code, Client, Départements associés, Documents, Dernière activité et Actions. Recherche, filtre département, formulaire de création et de modification, fiche détaillée. Les actions de gestion sont masquées sans la permission `clients.manage`. |
| **Menu** | « Clients » et « Départements » apparaissent dans le groupe « Documents » ; « Utilisateurs et rôles » dans le groupe « Administration ». Les entrées de gestion sont masquées quand le rôle n'y donne pas droit, et le serveur refuse de toute façon. |

Les écrans reprennent l'identité visuelle de la maquette : palette ébène, or, sable et naturel, polices Inter et Manrope, cartes, fenêtres et messages temporaires. Ils s'adaptent à l'ordinateur, à la tablette et au mobile.

## 4. Sécurité et règles serveur

- Chaque route est protégée par une permission ou une Policy Laravel, même si l'écran masque déjà l'action (RG-08).
- Chaque écriture passe par une Form Request avec des messages en français.
- Les réponses utilisent des API Resources et le format d'erreur commun (`FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`…).
- Toute action sensible écrit une entrée dans `audit_logs`, en ajout seul.
- Aucune suppression de département, de compte ni de client : la désactivation ou la radiation est privilégiée, et les codes restent définitifs.
- Aucun secret ni donnée réelle n'est présent dans le dépôt.

## 5. Tests et résultats

| Type de test | Résultat |
|--------------|----------|
| Tests automatiques du serveur | 121 sur 121 réussis (732 assertions) |
| Tests automatiques des écrans | 44 sur 44 réussis |
| Vérification TypeScript | Aucune erreur |
| Tests de l'API avec Postman | Collection de 136 requêtes rejouée le 25/11/2026 (voir section 6) |

Les tests couvrent les droits de chaque rôle, les règles D1 à D7 et C1 à C4, le retrait automatique du responsable, les refus de désactivation, le journal d'audit, ainsi que les parcours des écrans (création, validation, refus serveur, consultation seule, recherche et filtre).

## 6. Exécution Postman

La collection a été mise à jour avec le dossier **CLIENTS (lot 2.1)** : validation des champs, génération du code, création, modification, recherche, filtre département, visibilité du Directeur et du Collaborateur, refus d'écriture et journal d'audit.

| Exécution | Requêtes envoyées | Vérifications | Échecs |
|-----------|-------------------|---------------|--------|
| Collection complète, sans jeton de réinitialisation | 137 (136 requêtes, dont une répétée en boucle) ; 4 requêtes manuelles ignorées | 438 | 0 |

Le dossier 11 reste une étape manuelle : il exige le jeton reçu par e-mail, écrit dans `storage/logs/laravel.log` en développement. La procédure est décrite dans `docs/postman/GUIDE-TESTS-API.md`.

## 7. Anomalies et points d'attention

Aucune anomalie fonctionnelle n'est ouverte sur les trois modules.

Points corrigés pendant la finalisation :

- statuts du plan de développement remis à jour (lots 1.2, 1.3 et 2.1 terminés) ;
- introduction du guide Postman alignée sur les dossiers Départements et Clients ;
- contrôle du journal des clients corrigé pour retrouver l'entrée du client suivi, même quand plusieurs clients sont créés dans la même exécution ;
- fichier de compilation TypeScript `tsconfig.tsbuildinfo` exclu de Git.

## 8. Points en attente

Ces éléments restent à fournir ou à valider par DC-KNOWING avant les prochains lots :

- **Confirmation du réglage provisoire Q-14** pour la visibilité des clients avant le lot 2.4 ;
- **Q-05 et Q-06** pour l'arborescence documentaire (point de départ des 4 niveaux, noms des sous-dossiers internes) ;
- **Q-10 et règle de clôture** pour les exercices annuels ;
- **Validation de la répartition des permissions** entre les 7 rôles ;
- **Serveur SMTP, adresse d'expéditeur, logo et données officielles du cabinet** pour la mise en production.

## 9. Conclusion

Le socle de la GED et le référentiel **Clients** sont opérationnels, contrôlés par le serveur et couverts par des tests. Le prochain lot est l'**arborescence et le modèle de dossier client** (lot 2.2), dès que Q-05 et Q-06 sont tranchées.
