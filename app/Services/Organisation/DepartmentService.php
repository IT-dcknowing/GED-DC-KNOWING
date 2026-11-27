<?php

namespace App\Services\Organisation;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\Department;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Gestion des départements (lot 1.3, décisions D4, D6 et D7).
 */
class DepartmentService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Crée un département actif, sans responsable : celui-ci doit d'abord y être rattaché (D4).
     *
     * @param  array{code: string, name: string}  $data
     */
    public function create(array $data, User $actor): Department
    {
        $department = new Department(['code' => $data['code'], 'name' => $data['name'], 'is_active' => true]);
        $department->forceFill(['created_by' => $actor->id])->save();

        $this->audit->log(AuditEvent::DepartmentCreated, true, details: ['department' => $department->auditReference()], actor: $actor);

        return $department;
    }

    /**
     * Modifie le nom et le responsable. Le code n'est jamais modifié (D7).
     *
     * @param  array{name?: string, manager_id?: int|null}  $data
     */
    public function update(Department $department, array $data, User $actor): Department
    {
        $details = DB::transaction(function () use ($department, $data) {
            $department->refresh();
            $previousManager = $department->manager;
            $details = [];

            if (array_key_exists('name', $data) && $data['name'] !== $department->name) {
                $details['name'] = ['from' => $department->name, 'to' => $data['name']];
                $department->name = $data['name'];
            }

            $managerId = isset($data['manager_id']) ? (int) $data['manager_id'] : null;
            $currentManagerId = $department->manager_id !== null ? (int) $department->manager_id : null;

            if (array_key_exists('manager_id', $data) && $managerId !== $currentManagerId) {
                $manager = $managerId === null ? null : $this->eligibleManager($department, $managerId);
                $details['manager'] = [
                    'from' => $previousManager ? ['id' => $previousManager->id, 'name' => $previousManager->name] : null,
                    'to' => $manager ? ['id' => $manager->id, 'name' => $manager->name] : null,
                ];
                $department->manager_id = $manager?->id;
            }

            $department->save();

            return $details;
        });

        if ($details !== []) {
            $this->audit->log(AuditEvent::DepartmentUpdated, true,
                details: ['department' => $department->auditReference()] + $details, actor: $actor);
        }

        return $department;
    }

    /**
     * D6 : refusée tant que des comptes actifs sont rattachés au département.
     */
    public function deactivate(Department $department, User $actor): Department
    {
        $changed = DB::transaction(function () use ($department) {
            $department->refresh();

            $activeMembers = User::query()
                ->where('department_id', $department->id)
                ->where('is_active', true)
                ->lockForUpdate()
                ->count();

            if ($activeMembers > 0) {
                throw ValidationException::withMessages([
                    'department' => $activeMembers === 1
                        ? 'Impossible de désactiver ce département : 1 compte actif y est encore rattaché. Rattachez-le à un autre département ou désactivez-le d\'abord.'
                        : "Impossible de désactiver ce département : {$activeMembers} comptes actifs y sont encore rattachés. Rattachez-les à un autre département ou désactivez-les d'abord.",
                ]);
            }

            if (! $department->is_active) {
                return false;
            }

            // Aucun compte actif : un éventuel responsable désigné est forcément désactivé (D4).
            $department->forceFill(['is_active' => false, 'manager_id' => null])->save();

            return true;
        });

        if ($changed) {
            $this->audit->log(AuditEvent::DepartmentDeactivated, true, details: ['department' => $department->auditReference()], actor: $actor);
        }

        return $department;
    }

    public function activate(Department $department, User $actor): Department
    {
        if (! $department->is_active) {
            $department->forceFill(['is_active' => true])->save();
            $this->audit->log(AuditEvent::DepartmentActivated, true, details: ['department' => $department->auditReference()], actor: $actor);
        }

        return $department;
    }

    /**
     * D4 : retire la désignation de responsable d'un compte qui n'y a plus droit
     * (désactivé, autre rôle, autre département). Appelée après chaque modification d'un compte.
     */
    public function releaseIneligibleManagership(User $user, User $actor): void
    {
        $user->refresh();

        Department::query()->where('manager_id', $user->id)->get()
            ->each(function (Department $department) use ($user, $actor) {
                $reason = $this->ineligibilityReason($department, $user);

                if ($reason === null) {
                    return;
                }

                $department->forceFill(['manager_id' => null])->save();
                $this->audit->log(AuditEvent::DepartmentManagerRemoved, true, $user,
                    details: ['department' => $department->auditReference(), 'reason' => $reason], actor: $actor);
            });
    }

    /**
     * D4 : le futur responsable doit être actif, Responsable de Département, rattaché à ce
     * département, et ne diriger aucun autre département. Appelée dans une transaction.
     */
    private function eligibleManager(Department $department, int $userId): User
    {
        $user = User::query()->lockForUpdate()->find($userId);
        $reason = $user ? $this->ineligibilityReason($department, $user) : 'not_found';

        if ($reason === null && Department::query()->where('manager_id', $user->id)->whereKeyNot($department->id)->exists()) {
            $reason = 'manages_another_department';
        }

        if ($reason !== null) {
            throw ValidationException::withMessages(['manager_id' => match ($reason) {
                'not_found' => 'Ce compte n\'existe pas.',
                'inactive' => 'Ce compte est désactivé : il ne peut pas être responsable.',
                'role' => 'Le responsable doit avoir le rôle « Responsable de Département ».',
                'department' => 'Ce compte n\'est pas rattaché à ce département. Rattachez-le d\'abord dans « Utilisateurs et rôles ».',
                'manages_another_department' => 'Ce compte est déjà responsable d\'un autre département.',
            }]);
        }

        return $user;
    }

    /**
     * @return 'inactive'|'role'|'department'|null null si le compte peut diriger ce département
     */
    private function ineligibilityReason(Department $department, User $user): ?string
    {
        return match (true) {
            ! $user->is_active => 'inactive',
            $user->roleName() !== RoleName::DepartmentManager => 'role',
            (int) $user->department_id !== (int) $department->id => 'department',
            default => null,
        };
    }
}
