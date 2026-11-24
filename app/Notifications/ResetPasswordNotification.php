<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E-mail de réinitialisation du mot de passe (règle D2). Le lien ouvre l'application React.
 */
class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(#[\SensitiveParameter] public readonly string $token) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function url(object $notifiable): string
    {
        return config('app.frontend_url').'/reinitialisation?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe GED DC-KNOWING')
            ->greeting('Bonjour,')
            ->line('Une demande de réinitialisation du mot de passe de votre compte GED DC-KNOWING a été reçue.')
            ->action('Choisir un nouveau mot de passe', $this->url($notifiable))
            ->line("Ce lien est valable {$minutes} minutes et ne peut être utilisé qu'une seule fois.")
            ->line('Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.')
            ->salutation('GED DC-KNOWING');
    }
}
