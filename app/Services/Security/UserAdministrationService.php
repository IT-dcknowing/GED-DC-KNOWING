<?php

namespace App\Services\Security;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Gestion des comptes par le Super Administrateur (règles B1, B2, E3, G1, G2).
 */
class UserAdministrationService
{
    public function __construct(
        private readonly PasswordService $passwords,
        private readonly SessionInvalidator $sessions,
        private readonly LoginLockoutService $lockouts,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Crée un compte actif avec un mot de passe temporaire à changer à la première connexion.
     *
     * @param  array{name: string, email: string, role: string, department_id?: int|null}  $data
     * @return array{0: User, 1: string} le compte et son mot de passe temporaire (à afficher une seule fois)
     */
    public function create(array $data, User $actor): array
    {
        $temporary = $this->passwords->generateTemporary();

        $user = DB::transaction(function () use ($data, $actor, $temporary) {
            $user = new User([
                'name' => $data['name'],
                'email' => $data['email'],
                'department_id' => $data['department_id'] ?? null,
                'is_active' => true,
            ]);
            $user->forceFill([
                'created_by' => $actor->id,
                'password' => $temporary,
                'must_change_password' => true,
                'password_changed_at' => now(),
            ])->save();
            $user->syncRoles([$data['role']]);
            $this->passwords->recordCurrent($user);

            return $user;
        });

        $this->audit->log(AuditEvent::UserCreated, true, $user, details: ['role' => $data['role']], actor: $actor);

        return [$user->fresh(['department']), $temporary];
    }

    /**
     * @param  array{name?: string, email?: string, role?: string, department_id?: int|null}  $data
     */
    public function update(User $user, array $data, User $actor): User
    {
        $previousRole = $user->roleName()?->value;
        $newRole = $data['role'] ?? $previousRole;
        $roleChanged = $newRole !== $previousRole;

        DB::transaction(function () use ($user, $data, $roleChanged, $newRole) {
            if ($roleChanged && $user->is_active && $user->isSuperAdmin()) {
                $this->ensureAnotherActiveSuperAdminExists($user, 'role',
                    'Impossible de retirer ce rôle : il doit toujours rester au moins un Super Administrateur actif.');
            }

            $user->fill(array_intersect_key($data, array_flip(['name', 'email', 'department_id'])))->save();

            if ($roleChanged) {
                $user->syncRoles([$newRole]);
            }
        });

        $changes = array_keys(array_intersect_key($data, array_flip(['name', 'email', 'department_id'])));
        $details = ['fields' => $changes];

        if ($roleChanged) {
            $details['role'] = ['from' => $previousRole, 'to' => $newRole];
            // Les droits changent : l'utilisateur doit se reconnecter (règle E3).
            $details['sessions_closed'] = $this->sessions->forUser($user);
        }

        $this->audit->log(AuditEvent::UserUpdated, true, $user, details: $details, actor: $actor);

        return $user->fresh(['department']);
    }

    public function deactivate(User $user, User $actor): User
    {
        if ($user->is($actor)) {
            throw ValidationException::withMessages([
                'user' => 'Vous ne pouvez pas désactiver votre propre compte.',
            ]);
        }

        DB::transaction(function () use ($user) {
            if ($user->is_active && $user->isSuperAdmin()) {
                $this->ensureAnotherActiveSuperAdminExists($user, 'user',
                    'Impossible de désactiver ce compte : il doit toujours rester au moins un Super Administrateur actif.');
            }

            $user->forceFill(['is_active' => false])->save();
        });

        $closed = $this->sessions->forUser($user);
        $this->audit->log(AuditEvent::UserDeactivated, true, $user, details: ['sessions_closed' => $closed], actor: $actor);

        return $user->fresh(['department']);
    }

    public function activate(User $user, User $actor): User
    {
        $user->forceFill(['is_active' => true])->save();
        $this->audit->log(AuditEvent::UserActivated, true, $user, actor: $actor);

        return $user->fresh(['department']);
    }

    /**
     * Nouveau mot de passe temporaire : sessions fermées, verrouillage levé, changement obligatoire.
     */
    public function resetPassword(User $user, User $actor): string
    {
        $temporary = $this->passwords->generateTemporary();
        $this->passwords->setPassword($user, $temporary, mustChange: true);
        $closed = $this->sessions->forUser($user);
        $this->lockouts->clear($user->email);

        $this->audit->log(AuditEvent::UserPasswordReset, true, $user, details: ['sessions_closed' => $closed], actor: $actor);

        return $temporary;
    }

    public function unlock(User $user, User $actor): void
    {
        $this->lockouts->clear($user->email);
        $this->audit->log(AuditEvent::UserUnlocked, true, $user, actor: $actor);
    }

    /**
     * Règle G2 : appelée dans une transaction, verrouille les comptes Super Administrateur actifs
     * pour que deux actions simultanées ne puissent pas toutes deux réussir.
     */
    private function ensureAnotherActiveSuperAdminExists(User $user, string $field, string $message): void
    {
        $others = User::role(RoleName::SuperAdmin->value)
            ->where('is_active', true)
            ->whereKeyNot($user->getKey())
            ->lockForUpdate()
            ->count();

        if ($others === 0) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }
}
