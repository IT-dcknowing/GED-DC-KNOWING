<?php

namespace App\Http\Requests\Clients;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Modification d'un client (lot 2.1). Le code n'est jamais modifiable (C4) ;
 * les départements de suivi peuvent être ajoutés ou retirés (RG-02).
 */
class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
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
            'name' => ['sometimes', 'required', 'string', 'min:3', 'max:160'],
            'legal_form' => ['sometimes', 'nullable', 'string', 'max:30'],
            'sector' => ['sometimes', 'nullable', 'string', 'max:120'],
            'tax_regime' => ['sometimes', 'nullable', 'string', 'max:40'],
            'rccm' => ['sometimes', 'nullable', 'string', 'max:60'],
            'dfe' => ['sometimes', 'nullable', 'string', 'max:60'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:160'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'started_on' => ['sometimes', 'nullable', 'date'],
            'department_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'department_ids.*' => ['integer', 'distinct', 'exists:departments,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.prohibited' => 'Le code d\'un client n\'est pas modifiable après sa création.',
            'name.required' => 'Saisissez la dénomination du client.',
            'name.min' => 'La dénomination doit contenir au moins 3 caractères.',
            'department_ids.required' => 'Sélectionnez au moins un département de suivi (RG-02).',
            'department_ids.min' => 'Sélectionnez au moins un département de suivi (RG-02).',
            'department_ids.*.exists' => 'Ce département n\'existe pas.',
        ];
    }
}
