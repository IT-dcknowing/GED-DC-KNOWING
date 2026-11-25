<?php

namespace App\Http\Requests\Departments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification du nom et du responsable. Le code n'est pas modifiable (décision D7) ;
 * l'éligibilité du responsable (D4) est contrôlée par DepartmentService.
 */
class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
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
            'code' => ['prohibited'],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:120', Rule::unique('departments', 'name')->ignore($this->route('department'))],
            'manager_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.prohibited' => 'Le code d\'un département ne peut pas être modifié après sa création.',
            'name.unique' => 'Un département porte déjà ce nom.',
        ];
    }
}
