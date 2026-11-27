<?php

namespace App\Enums;

/**
 * Nature d'un dossier dans l'arborescence GED.
 */
enum FolderNature: string
{
    case RootSpace = 'root_space';       // Espaces de niveau 1 (00_DIRECTION, 01_CLIENTS, etc.)
    case Model = 'model';                // _MODELE_DOSSIER_CLIENT
    case ClientRoot = 'client_root';     // Racine du client (ex: CLI-0001 · NOM)
    case Permanent = 'permanent';        // A_PERMANENT
    case PermSub = 'perm_sub';           // A1_Juridique, A2_Contrat, etc.
    case Exercises = 'exercises';        // B_EXERCICES
    case Year = 'year';                  // Exercice annuel (ex: 2024)
    case Rubrique = 'rubrique';          // 1_Pieces, 2_Comptabilite, etc.
    case Custom = 'custom';              // Dossier libre créé par un utilisateur
    case Archived = 'archived';          // Zone ou dossier d'archives

    public function label(): string
    {
        return match ($this) {
            self::RootSpace => 'Espace racine',
            self::Model => 'Dossier modèle',
            self::ClientRoot => 'Dossier client',
            self::Permanent => 'Dossier permanent',
            self::PermSub => 'Rubrique permanente',
            self::Exercises => 'Dossier exercices',
            self::Year => 'Exercice annuel',
            self::Rubrique => 'Rubrique d\'exercice',
            self::Custom => 'Sous-dossier libre',
            self::Archived => 'Dossier archivé',
        };
    }

    /**
     * Vrai si le dossier est structurel (imposé par le système, non renommable, non supprimable).
     */
    public function isStructural(): bool
    {
        return $this !== self::Custom;
    }

    /**
     * Vrai si la nature du dossier autorise en théorie le dépôt direct de documents.
     */
    public function allowsUpload(): bool
    {
        return in_array($this, [
            self::RootSpace,
            self::ClientRoot,
            self::PermSub,
            self::Rubrique,
            self::Custom,
        ], true);
    }

    /**
     * Vrai si on autorise la création de sous-dossiers libres à l'intérieur.
     */
    public function allowsCustomSubfolders(): bool
    {
        return in_array($this, [
            self::RootSpace,
            self::ClientRoot,
            self::PermSub,
            self::Rubrique,
            self::Custom,
        ], true);
    }
}
