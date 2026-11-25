<?php

namespace App\Http\Requests\Clients;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Création d'un client (lot 2.1, décision C1).
 *
 * Obligatoires : la dénomination et au moins un département de suivi (RG-02).
 * Le code est généré par le serveur (C2) et n'est jamais accepté du client.
 */
class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            // La maquette affiche les dénominations en majuscules ; le serveur applique la même règle.
            $this->merge(['name' => mb_strtoupper(preg_replace('/\s+/u', ' ', trim($this->input('name'))))]);
        }

        if (is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->input('email')))]);
        }

        foreach (['legal_form', 'sector', 'tax_regime', 'rccm', 'dfe', 'address', 'phone', 'contact_name'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field))]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['prohibited'],
            'name' => ['required', 'string', 'min:3', 'max:160'],
            'legal_form' => ['nullable', 'string', 'max:30'],
            'sector' => ['nullable', 'string', 'max:120'],
            'tax_regime' => ['nullable', 'string', 'max:40'],
            'rccm' => ['nullable', 'string', 'max:60'],
            'dfe' => ['nullable', 'string', 'max:60'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:160'],
            'contact_name' => ['nullable', 'string', 'max:120'],
            'started_on' => ['nullable', 'date'],
            'department_ids' => ['required', 'array', 'min:1'],
            'department_ids.*' => ['integer', 'distinct', 'exists:departments,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.prohibited' => 'Le code d\'un client est généré automatiquement : il ne peut pas être saisi.',
            'name.required' => 'Saisissez la dénomination du client.',
            'name.min' => 'La dénomination doit contenir au moins 3 caractères.',
            'department_ids.required' => 'Sélectionnez au moins un département de suivi (RG-02).',
            'department_ids.min' => 'Sélectionnez au moins un département de suivi (RG-02).',
            'department_ids.*.exists' => 'Ce département n\'existe pas.',
        ];
    }
}
