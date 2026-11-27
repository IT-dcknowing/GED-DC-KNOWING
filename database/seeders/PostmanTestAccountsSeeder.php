<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Models\Client;
use App\Models\Department;
use App\Models\User;
use App\Services\Security\LoginLockoutService;
use App\Services\Security\PasswordService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Comptes de test de la collection Postman (docs/postman).
 *
 * - Exécution limitée aux environnements « local » et « testing » : refus explicite ailleurs.
 * - Mots de passe CONNUS et documentés (docs/postman/GUIDE-TESTS-API.md) : uniquement pour les tests.
 * - Chaque exécution remet ces comptes dans leur état initial : les comptes @postman.test
 *   (y compris ceux créés par la collection) sont supprimés puis recréés, leurs verrouillages,
 *   liens de réinitialisation et sessions sont effacés. Aucun autre compte n'est touché.
 *
 * Usage, avant chaque exécution de la collection :
 *   php artisan db:seed --class=PostmanTestAccountsSeeder
 */
class PostmanTestAccountsSeeder extends Seeder
{
    public const DOMAIN = 'postman.test';

    /** Adresse sans compte, utilisée par la collection pour les cas « adresse inconnue ». */
    public const UNKNOWN_EMAIL = 'postman.inconnu@postman.test';

    /**
     * clé => [adresse, rôle, mot de passe, actif, mot de passe à changer, avec département]
     *
     * @var array<string, array{0: string, 1: RoleName, 2: string, 3: bool, 4: bool, 5: bool}>
     */
    public const ACCOUNTS = [
        'admin' => ['postman.admin@postman.test', RoleName::SuperAdmin, 'PostmanAdmin2026', true, false, false],
        'standard' => ['postman.collaborateur@postman.test', RoleName::Collaborator, 'PostmanCollab2026', true, false, true],
        'director' => ['postman.directeur@postman.test', RoleName::Director, 'PostmanDirect2026', true, false, false],
        'inactive' => ['postman.desactive@postman.test', RoleName::Collaborator, 'PostmanInactif2026', false, false, true],
        'first_login' => ['postman.premiere@postman.test', RoleName::Collaborator, 'PostmanTemp2026a', true, true, true],
        'lockout' => ['postman.verrouillage@postman.test', RoleName::Collaborator, 'PostmanVerrou2026', true, false, true],
        'reset' => ['postman.reinit@postman.test', RoleName::Collaborator, 'PostmanReinit2026', true, false, true],
        'dept_manager' => ['postman.responsable@postman.test', RoleName::DepartmentManager, 'PostmanRespDep2026', true, false, true],
    ];

    /** Préfixe des codes de départements créés par la collection, effacés à chaque remise à zéro. */
    public const DEPARTMENT_CODE_PREFIX = 'PM-';

    /** Préfixe des dénominations des clients créés par la collection, effacés à chaque remise à zéro. */
    public const CLIENT_NAME_PREFIX = 'POSTMAN';

    public function run(PasswordService $passwords, LoginLockoutService $lockouts): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException(
                'Les comptes de test Postman ne peuvent être créés que dans les environnements « local » ou « testing ».'
            );
        }

        $this->call(RolesAndPermissionsSeeder::class);

        DB::transaction(function () use ($passwords, $lockouts) {
            $this->resetPreviousRun($lockouts);

            $department = Department::firstOrCreate(
                ['code' => 'DEP-TEST'],
                ['name' => 'Département de test', 'is_active' => true],
            );
            $department->forceFill(['name' => 'Département de test', 'is_active' => true])->save();

            foreach (self::ACCOUNTS as $key => [$email, $role, $password, $active, $mustChange, $withDepartment]) {
                $user = User::create([
                    'name' => 'Postman · '.$role->label().($key === 'inactive' ? ' (désactivé)' : ''),
                    'email' => $email,
                    'password' => $password,
                    'department_id' => $withDepartment ? $department->id : null,
                    'is_active' => $active,
                ]);
                $user->forceFill(['must_change_password' => $mustChange, 'password_changed_at' => now()])->save();
                $user->syncRoles([$role->value]);
                $passwords->recordCurrent($user);

                if ($key === 'dept_manager') {
                    $department->forceFill(['manager_id' => $user->id])->save();
                }
            }
        });

        if (isset($this->command)) {
            $this->command->newLine();
            $this->command->warn('Comptes de test Postman (environnements local et testing uniquement) remis à zéro :');
            $this->command->table(
                ['Adresse e-mail', 'Rôle', 'État'],
                array_map(fn (array $a) => [
                    $a[0],
                    $a[1]->label(),
                    ! $a[3] ? 'désactivé' : ($a[4] ? 'actif, mot de passe à changer' : 'actif'),
                ], array_values(self::ACCOUNTS)),
            );
            $this->command->info('Mots de passe : voir docs/postman/GUIDE-TESTS-API.md.');
        }
    }

    /**
     * Supprime les comptes @postman.test (et ce qui s'y rattache) laissés par une exécution précédente.
     */
    private function resetPreviousRun(LoginLockoutService $lockouts): void
    {
        $previous = User::query()->where('email', 'like', '%@'.self::DOMAIN)->get();
        $emails = $previous->pluck('email')
            ->merge(array_column(self::ACCOUNTS, 0))
            ->push(self::UNKNOWN_EMAIL)
            ->unique();

        foreach ($emails as $email) {
            $lockouts->clear($email);
        }

        DB::table('password_reset_tokens')->whereIn('email', $emails->all())->delete();
        DB::table(config('session.table', 'sessions'))->whereIn('user_id', $previous->pluck('id'))->delete();

        // Suppression modèle par modèle : retire aussi les rôles (spatie) et l'historique des mots de passe.
        // Les entrées du journal d'audit sont conservées (le compte concerné devient « null »).
        $previous->each->delete();

        // Départements créés par la collection lors d'une exécution précédente (codes « PM-… »).
        Department::query()->where('code', 'like', self::DEPARTMENT_CODE_PREFIX.'%')->delete();

        // Clients créés par la collection lors d'une exécution précédente (dénominations « POSTMAN… »).
        Client::query()->where('name', 'like', self::CLIENT_NAME_PREFIX.'%')->delete();
    }
}
