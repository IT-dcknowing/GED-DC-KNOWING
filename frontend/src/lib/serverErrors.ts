import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { apiErrorMessage } from '@/api/client';

type LaravelErrorBody = { message?: string; errors?: Record<string, string[]> };

/**
 * Reporte les erreurs de validation renvoyées par Laravel (422) sur les champs du formulaire.
 * Retourne le message à afficher en tête de formulaire pour ce qui ne correspond à aucun champ.
 */
export function applyServerErrors<T extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<T>,
    fields: readonly Path<T>[],
): string | null {
    if (isAxiosError<LaravelErrorBody>(error) && error.response?.status === 422 && error.response.data?.errors) {
        const unmatched: string[] = [];

        for (const [field, messages] of Object.entries(error.response.data.errors)) {
            const message = messages[0];
            if (!message) continue;

            if ((fields as readonly string[]).includes(field)) {
                setError(field as Path<T>, { type: 'server', message });
            } else {
                unmatched.push(message);
            }
        }

        return unmatched[0] ?? null;
    }

    return apiErrorMessage(error);
}
