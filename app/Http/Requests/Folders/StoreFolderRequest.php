<?php

namespace App\Http\Requests\Folders;

use Illuminate\Foundation\Http\FormRequest;

class StoreFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim(preg_replace('/\s+/u', ' ', $this->input('name')))]);
        }

        if (is_string($this->input('description'))) {
            $this->merge(['description' => trim($this->input('description'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'parent_id' => ['required', 'integer', 'exists:folders,id'],
            'name' => [
                'required',
                'string',
                'min:2',
                'max:120',
                'regex:~^[^/\\\\:*?"<>|]+$~u', // Interdit les caractères illégaux de filesystem
            ],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'parent_id.required' => 'Le dossier parent est requis.',
            'parent_id.exists' => 'Le dossier parent sélectionné n\'existe pas.',
            'name.required' => 'Le nom du dossier est obligatoire.',
            'name.min' => 'Le nom du dossier doit comporter au moins 2 caractères.',
            'name.max' => 'Le nom du dossier ne peut pas dépasser 120 caractères.',
            'name.regex' => 'Le nom du dossier contient des caractères interdits (/ \\ : * ? " < > |).',
        ];
    }
}
