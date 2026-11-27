import { z } from 'zod';

/**
 * Politique de mot de passe (règles C1, C2), identique à App\Rules\StrongPassword côté Laravel.
 * Elle sert à guider la saisie ; le serveur reste seul juge, notamment pour l'historique (C4).
 */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 64;

export type PasswordRule = { id: string; label: string; test: (value: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
    { id: 'length', label: `Au moins ${PASSWORD_MIN} caractères`, test: (v) => [...v].length >= PASSWORD_MIN },
    { id: 'upper', label: 'Une lettre majuscule', test: (v) => /\p{Lu}/u.test(v) },
    { id: 'lower', label: 'Une lettre minuscule', test: (v) => /\p{Ll}/u.test(v) },
    { id: 'digit', label: 'Un chiffre', test: (v) => /\d/.test(v) },
];

const MESSAGES: Record<string, string> = {
    length: `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`,
    upper: 'Le mot de passe doit contenir au moins une lettre majuscule.',
    lower: 'Le mot de passe doit contenir au moins une lettre minuscule.',
    digit: 'Le mot de passe doit contenir au moins un chiffre.',
};

export const newPasswordSchema = z
    .string()
    .min(1, 'Saisissez un nouveau mot de passe.')
    .superRefine((value, ctx) => {
        if (!value) return;
        const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
        if (failed) {
            ctx.addIssue({ code: 'custom', message: MESSAGES[failed.id] ?? 'Mot de passe non conforme.' });
        } else if ([...value].length > PASSWORD_MAX) {
            ctx.addIssue({ code: 'custom', message: `Le mot de passe est trop long (${PASSWORD_MAX} caractères au maximum).` });
        }
    });

/** Nouveau mot de passe et sa confirmation. */
export const passwordPairSchema = z
    .object({
        password: newPasswordSchema,
        password_confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
    })
    .refine((v) => v.password === v.password_confirmation, {
        path: ['password_confirmation'],
        message: 'La confirmation ne correspond pas au nouveau mot de passe.',
    });
