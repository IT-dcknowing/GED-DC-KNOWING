<?php

namespace App\Http\Requests\Documents;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('subject'))) {
            $this->merge(['subject' => trim(preg_replace('/\s+/u', ' ', $this->input('subject')))]);
        }
        if (is_string($this->input('doc_type'))) {
            $this->merge(['doc_type' => strtoupper(trim($this->input('doc_type')))]);
        }
        if (is_string($this->input('status_suffix'))) {
            $this->merge(['status_suffix' => strtoupper(trim($this->input('status_suffix')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'folder_id' => ['required', 'integer', 'exists:folders,id'],
            'file' => ['required', 'file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
            'doc_type' => ['required', 'string', 'max:32'],
            'status_suffix' => ['required', 'string', 'max:32'],
            'subject' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'folder_id.required' => 'Le dossier de destination est requis.',
            'folder_id.exists' => 'Le dossier de destination n\'existe pas.',
            'file.required' => 'Veuillez sélectionner un fichier à déposer.',
            'file.file' => 'Le fichier envoyé est invalide.',
            'file.max' => 'Le fichier dépasse la taille maximale autorisée de 25 Mo.',
            'file.mimes' => 'Formats acceptés : PDF, DOC, DOCX, XLS, XLSX, PNG, JPG.',
            'doc_type.required' => 'Le type de document est obligatoire.',
            'status_suffix.required' => 'Le statut de la pièce est obligatoire.',
            'subject.required' => 'L\'objet du document est obligatoire.',
            'subject.min' => 'L\'objet doit comporter au moins 2 caractères.',
            'subject.max' => 'L\'objet ne peut pas dépasser 120 caractères.',
        ];
    }
}
