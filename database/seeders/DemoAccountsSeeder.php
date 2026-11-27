<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\Department;
use App\Models\LoginLockout;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Initialise ou réinitialise les 7 accès de démonstration (un par rôle)
 * avec le mot de passe connu « DcKnowing2026 » pour les tests sur l'interface.
 *
 * Limité aux environnements local et testing.
 */
class DemoAccountsSeeder extends Seeder
{
    public const PASSWORD = 'DcKnowing2026';

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('DemoAccountsSeeder ne peut être exécuté qu\'en environnement local ou testing.');
        }

        $this->call(RolesAndPermissionsSeeder::class);

        $department = Department::where('is_active', true)->first() ?? Department::firstOrCreate(
            ['code' => 'DEP-COMPTA'],
            ['name' => 'Comptabilité & Fiscalité', 'is_active' => true]
        );

        $accounts = [
            ['name' => 'Koffi Administrateur (Super Admin)', 'email' => 'admin@ged.test', 'role' => RoleName::SuperAdmin, 'with_dept' => false],
            ['name' => 'Marcelle Directrice (Direction)', 'email' => 'directeur@ged.test', 'role' => RoleName::Director, 'with_dept' => false],
            ['name' => 'Amadou Diallo (Resp. GED)', 'email' => 'resp.ged@ged.test', 'role' => RoleName::GedManager, 'with_dept' => false],
            ['name' => 'Jean-Eudes Kouassi (Resp. Département)', 'email' => 'resp.dept@ged.test', 'role' => RoleName::DepartmentManager, 'with_dept' => true],
            ['name' => 'Awa Bamba (Collaboratrice)', 'email' => 'collaborateur@ged.test', 'role' => RoleName::Collaborator, 'with_dept' => true],
            ['name' => 'Yao Junior (Stagiaire)', 'email' => 'stagiaire@ged.test', 'role' => RoleName::Intern, 'with_dept' => true],
            ['name' => 'Cabinet Externe (Auditeur)', 'email' => 'auditeur@ged.test', 'role' => RoleName::Auditor, 'with_dept' => false],
        ];

        $hashedPassword = Hash::make(self::PASSWORD);

        foreach ($accounts as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $hashedPassword,
                    'department_id' => $data['with_dept'] ? $department->id : null,
                    'is_active' => true,
                ]
            );

            $user->forceFill([
                'must_change_password' => false,
                'password_changed_at' => now(),
            ])->save();

            $user->syncRoles([$data['role']->value]);

            // Désigner le responsable du département si applicable et s'il ne dirige pas déjà un département (D4)
            if ($data['role'] === RoleName::DepartmentManager && ! $department->manager_id && ! Department::where('manager_id', $user->id)->exists()) {
                $department->update(['manager_id' => $user->id]);
            }
        }

        // Réinitialiser les éventuels verrouillages de connexion
        LoginLockout::query()->delete();
    }
}
