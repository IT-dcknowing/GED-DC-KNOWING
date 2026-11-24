<?php

namespace App\Console\Commands;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\User;
use App\Rules\StrongPassword;
use App\Services\Security\AuditLogger;
use App\Services\Security\PasswordService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Crée un compte Super Administrateur. Le mot de passe est saisi de façon masquée,
 * jamais en argument (il apparaîtrait dans l'historique du terminal).
 */
class CreateAdminCommand extends Command
{
    protected $signature = 'ged:create-admin {email : Adresse e-mail professionnelle} {--name= : Nom complet}';

    protected $description = 'Crée un compte Super Administrateur de la GED';

    public function handle(PasswordService $passwords, AuditLogger $audit): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        $validator = Validator::make(['email' => $email], ['email' => ['required', 'email', 'unique:users,email']], [
            'email.unique' => 'Un compte existe déjà avec cette adresse e-mail.',
            'email.email' => 'Adresse e-mail invalide.',
        ]);

        if ($validator->fails()) {
            $this->components->error($validator->errors()->first('email'));

            return self::FAILURE;
        }

        $name = $this->option('name') ?: text(label: 'Nom complet', required: true);

        $secret = password(
            label: 'Mot de passe',
            required: true,
            validate: fn (string $value) => Validator::make(['password' => $value], ['password' => [new StrongPassword]])
                ->errors()->first('password') ?: null,
            hint: '10 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.',
        );

        $confirmation = password(label: 'Confirmez le mot de passe', required: true);

        if ($secret !== $confirmation) {
            $this->components->error('Les deux mots de passe ne correspondent pas.');

            return self::FAILURE;
        }

        $this->callSilently('db:seed', ['--class' => RolesAndPermissionsSeeder::class, '--force' => true]);

        $user = DB::transaction(function () use ($name, $email, $secret, $passwords) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $secret,
                'is_active' => true,
            ]);
            // L'administrateur a choisi lui-même son mot de passe : pas de changement obligatoire.
            $user->forceFill(['password_changed_at' => now()])->save();
            $passwords->recordCurrent($user);
            $user->syncRoles([RoleName::SuperAdmin->value]);

            return $user;
        });

        $audit->log(AuditEvent::UserCreated, true, $user, details: ['role' => RoleName::SuperAdmin->value, 'via' => 'console']);

        $this->components->info("Compte Super Administrateur créé pour {$user->email}.");

        return self::SUCCESS;
    }
}
