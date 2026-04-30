<?php

use App\Models\ClientDocument;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return ['status' => 'ok', 'app' => 'SistAgendamentos API'];
});

/**
 * Rota de download de documento com URL assinada (signed URL).
 * Valida assinatura automaticamente — sem auth token necessário.
 */
Route::get('/documents/{docId}/download', function (string $docId) {
    $doc = ClientDocument::findOrFail($docId);
    $path = Storage::disk('local')->path($doc->storage_path);

    if (! file_exists($path)) {
        abort(404, 'Arquivo não encontrado no storage.');
    }

    return response()->download($path, $doc->file_name, [
        'Content-Type' => $doc->file_type,
    ]);
})->name('client.document.download')->middleware('signed');
