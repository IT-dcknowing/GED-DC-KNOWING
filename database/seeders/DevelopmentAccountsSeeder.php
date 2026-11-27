<?php

namespace Database\Seeders;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\Department;
use App\Models\User;
use App\Services\Security\AuditLogger;
use App\Services\Security\PasswordService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Comptes de TEST, un par rôle, pour le développement et la recette uniquement.
 *
 * - Refuse de s'exécuter en production : aucune donnée fictive dans la base réelle.
 * - Adresses en @ged.test (domaine réservé, ne peut appartenir à personne).
 * - Mots de passe temporaires générés, affichés une seule fois, à changer à la première connexion.
 * - Relançable : un compte qui existe déjà n'est pas modifié.
 *
 * Usage : php artisan db:seed --class=DevelopmentAccountsSeeder
 */
class DevelopmentAccountsSeeder extends Seeder
{
    public const DOMAIN = 'ged.test';

    private const ACCOUNTS = [
        RoleName::SuperAdmin->value => ['super.admin', false],
        RoleName::Director->value => ['directeur', false],
        RoleName::GedManager->value => ['responsable.ged', false],
        RoleName::DepartmentManager->value => ['responsable.departement', true],
        RoleName::Collaborator->value => ['collaborateur', true],
        RoleName::Intern->value => ['stagiaire', true],
        RoleName::Auditor->value => ['auditeur', false],
    ];

    /** @var list<array{0: string, 1: string, 2: string}> lignes affichées : rôle, e-mail, mot de passe */
    public array $created = [];

    public function run(PasswordService $passwords, AuditLogger $audit): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Les comptes de test ne peuvent pas être créés en production.');
        }

        $this->call(RolesAndPermissionsSeeder::class);

        $department = Department::firstOrCreate(
            ['code' => 'DEP-TEST'],
            ['name' => 'Département de test', 'is_active' => true],
        );

        foreach (self::ACCOUNTS as $roleValue => [$localPart, $withDepartment]) {
            $role = RoleName::from($roleValue);
            $email = $localPart.'@'.self::DOMAIN;

            if (User::where('email', $email)->exists()) {
                $this->created[] = [$role->label(), $email, 'compte déjà existant, inchangé'];

                continue;
            }

            $temporary = $passwords->generateTemporary();

            $user = DB::transaction(function () use ($role, $email, $temporary, $withDepartment, $department, $passwords) {
                $user = User::create([
                    'name' => 'Test · '.$role->label(),
                    'email' => $email,
                    'password' => $temporary,
                    'department_id' => $withDepartment ? $department->id : null,
                    'is_active' => true,
                ]);
                $user->forceFill(['must_change_password' => true, 'password_changed_at' => now()])->save();
                $user->syncRoles([$role->value]);
                $passwords->recordCurrent($user);

                return $user;
            });

            $audit->log(AuditEvent::UserCreated, true, $user, details: ['role' => $role->value, 'via' => 'development_seeder']);
            $this->created[] = [$role->label(), $email, $temporary];
        }

        $this->assignTestDepartmentManager($department);

        if (isset($this->command)) {
            $this->command->newLine();
            $this->command->warn('Comptes de TEST (développement uniquement). Mots de passe temporaires affichés une seule fois :');
            $this->command->table(['Rôle', 'Adresse e-mail', 'Mot de passe temporaire'], $this->created);
            $this->command->info('Chaque compte devra choisir son propre mot de passe à la première connexion.');
        }
    }

    /**
     * Le département de test reçoit pour responsable le compte de test « Responsable de Département »,
     * s'il n'en a pas déjà un et si ce compte remplit les conditions (décision D4).
     */
    private function assignTestDepartmentManager(Department $department): void
    {
        $manager = User::where('email', 'responsable.departement@'.self::DOMAIN)->first();

        if ($department->manager_id !== null || $manager === null || ! $manager->is_active
            || $manager->roleName() !== RoleName::DepartmentManager
            || (int) $manager->department_id !== (int) $department->id
            || Department::where('manager_id', $manager->id)->exists()) {
            return;
        }

        $department->forceFill(['manager_id' => $manager->id])->save();
    }
}
