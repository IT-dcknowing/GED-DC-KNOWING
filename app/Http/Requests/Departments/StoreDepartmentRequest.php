<?php

namespace App\Http\Requests\Departments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Création d'un département (décision D7 pour le code). Le droit est vérifié par DepartmentPolicy.
 */
class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => mb_strtoupper(trim($this->input('code')))]);
        }

        if (is_string($this->input('name'))) {
            $this->merge(['name' => preg_replace('/\s+/u', ' ', trim($this->input('name')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'min:2', 'max:20', 'regex:/^[A-Z0-9-]+$/', Rule::unique('departments', 'code')],
            'name' => ['required', 'string', 'min:2', 'max:120', Rule::unique('departments', 'name')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'Le code ne peut contenir que des lettres majuscules, des chiffres et des tirets (ex. DEP-01).',
            'code.unique' => 'Un département utilise déjà ce code.',
            'name.unique' => 'Un département porte déjà ce nom.',
        ];
    }
}
