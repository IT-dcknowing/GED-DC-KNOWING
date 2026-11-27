# GED-DC-KNOWING : rapport d'activité

| | |
|---|---|
| **Projet** | GED-DC-KNOWING, gestion électronique des documents du cabinet DC-KNOWING |
| **Date** | 24 novembre 2026 |
| **Fonctionnalité livrée** | Authentification |
| **Statut** | Développée, testée et publiée sur GitHub |

## 1. Synthèse

La première fonctionnalité de la GED, l'**authentification**, est terminée. Elle couvre :
- la connexion ;
- la première connexion ;
- la gestion des mots de passe et le mot de passe oublié ;
- la gestion des sessions ;
- le journal d'audit ;
- la protection du compte administrateur.

Les **35 règles de gestion** demandées sont respectées. Toutes ont été vérifiées par des tests automatisés, qui sont tous réussis. Les écrans reprennent l'identité visuelle de la maquette.

## 2. Ce qui a été réalisé

| Fonction | Description |
|----------|-------------|
| **Connexion** | Par adresse e-mail et mot de passe, vérifiés par le serveur. Le message d'erreur est le même que l'adresse existe ou non. Après 5 échecs consécutifs, la connexion est bloquée 15 minutes. Le compteur repart à zéro après une connexion réussie. |
| **Première connexion** | Les comptes sont créés uniquement par l'administrateur, avec un mot de passe temporaire généré automatiquement. La personne doit le remplacer avant d'accéder à l'application. |
| **Mots de passe** | Au moins 10 caractères, avec une majuscule, une minuscule et un chiffre. Stockage sécurisé (chiffrement bcrypt). Le mot de passe actuel et les 2 précédents ne peuvent pas être réutilisés. La modification depuis le profil exige le mot de passe actuel et ferme les autres sessions. |
| **Mot de passe oublié** | Un lien de réinitialisation est envoyé par e-mail. Il est valable une heure et utilisable une seule fois. La réponse est identique que l'adresse existe ou non. Après une réinitialisation, toutes les sessions sont fermées. |
| **Sessions** | Déconnexion automatique après 30 minutes d'inactivité. La déconnexion est effective côté serveur. Désactiver un compte ou changer son rôle ferme immédiatement ses sessions. Les droits sont vérifiés à chaque action. |
| **Journal d'audit** | Les connexions (réussies ou échouées), les verrouillages, les réinitialisations, les modifications de mot de passe et les déconnexions sont enregistrés avec la date, l'heure, l'adresse e-mail et l'adresse IP. Le journal ne peut être ni modifié ni effacé, et aucun mot de passe n'y figure. |
| **Protection de l'administrateur** | Un administrateur ne peut pas désactiver son propre compte. L'application garantit qu'il reste toujours au moins un administrateur actif. |
| **Gestion des comptes** | L'administrateur peut créer un compte, attribuer un rôle, activer ou désactiver un compte, générer un nouveau mot de passe temporaire et débloquer un compte verrouillé. |

Aucune inscription libre n'est possible : seul l'administrateur crée les comptes.

## 3. Écrans réalisés

| Écran | Description |
|-------|-------------|
| Connexion | Reprend la page de connexion de la maquette : panneau ébène, logo, présentation, champs avec icônes, affichage du mot de passe, lien « Mot de passe oublié » |
| Mot de passe oublié | Saisie de l'adresse e-mail, puis confirmation |
| Réinitialisation | Choix du nouveau mot de passe, avec les exigences vérifiées pendant la saisie |
| Première connexion | Remplacement obligatoire du mot de passe temporaire |
| Modification du mot de passe | Depuis le menu du profil |
| Accès refusé | Affiché quand la personne n'a pas les droits nécessaires |
| Accueil | Profil de la personne connectée |

Les écrans s'adaptent à l'ordinateur, à la tablette et au mobile. Quand la session expire, l'utilisateur est renvoyé à la page de connexion avec un message clair.

## 4. Sécurité

- L'accès est contrôlé par le serveur à chaque action, quel que soit l'écran affiché.
- Les mots de passe ne sont jamais stockés ni affichés en clair. Le mot de passe temporaire n'est montré qu'une seule fois à l'administrateur.
- Les messages d'erreur ne permettent pas de deviner quelles adresses e-mail ont un compte.
- Les messages d'erreur ne révèlent aucune information technique sur le serveur.
- Aucun mot de passe ni information confidentielle n'a été publié sur GitHub.

## 5. Tests et résultats

| Type de test | Résultat |
|--------------|----------|
| Tests automatiques du serveur (les 35 règles) | 78 sur 78 réussis |
| Tests automatiques des écrans | 21 sur 21 réussis |
| Tests de l'API avec Postman | 250 vérifications sur 250 réussies |
| Vérification visuelle des écrans (ordinateur et mobile) | Conforme à la maquette |

Les tests Postman sont documentés et peuvent être rejoués par un responsable technique.

## 6. Anomalies corrigées

Pendant le développement et les tests, 11 anomalies ont été détectées et corrigées, dont 4 liées à la sécurité :
- un blocage après échecs de connexion trop court et facile à contourner ;
- un accès au profil qui contournait le changement obligatoire du mot de passe ;
- une erreur technique, visible lors d'une connexion faite hors de l'application ;
- des messages d'erreur qui affichaient des informations techniques sur le serveur.

Chaque correction est couverte par un test automatique.

## 7. Points en attente

Ces éléments sont à fournir ou à valider par DC-KNOWING :
- **Le serveur d'envoi des e-mails et l'adresse d'expéditeur.** Sans eux, le lien « mot de passe oublié » ne peut pas être envoyé en production.
- **Le logo officiel et le domaine e-mail du cabinet**, pour finaliser la page de connexion.
- **La validation des droits attribués à chacun des 7 rôles.** Une répartition provisoire, issue de la maquette, est en place.

## 8. Conclusion

L'authentification est opérationnelle et sécurisée, et toutes ses règles sont vérifiées. Elle constitue le point d'entrée de l'application, sur lequel s'appuieront les prochains modules de la GED.
