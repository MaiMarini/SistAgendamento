<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\ClientDocument;
use App\Models\ClientObservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    // =========================================================================
    // CRUD
    // =========================================================================

    /**
     * GET /api/clients?search=termo
     *
     * Lista clientes ativos. Busca parcial por name ou cpf (case-insensitive).
     * Limit 30 resultados (mesma regra do Python).
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->effectiveCompanyId();

        $query = Client::where('company_id', $companyId)
            ->where('active', true);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('cpf', 'LIKE', "%{$search}%");
            });
        }

        $clients = $query->orderBy('name')->limit(30)->get();

        return response()->json($clients);
    }

    /**
     * POST /api/clients
     */
    public function store(CreateClientRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['company_id'] = $request->user()->effectiveCompanyId();

        $client = Client::create($data);

        return response()->json($client, 201);
    }

    /**
     * PATCH /api/clients/{clientId}
     *
     * Após atualizar, sincroniza campos denormalizados em appointments.
     */
    public function update(string $clientId, UpdateClientRequest $request): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $client->update($request->validated());
        $client->refresh();

        // Sync campos denormalizados em appointments (mesma lógica do Python)
        Appointment::where('client_id', $client->id)->update([
            'client_name'  => $client->name,
            'client_email' => $client->email,
            'client_phone' => $client->phone,
            'client_cpf'   => $client->cpf,
        ]);

        return response()->json($client);
    }

    /**
     * DELETE /api/clients/{clientId}
     *
     * Soft-delete: active=false.
     */
    public function destroy(string $clientId): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $client->update(['active' => false]);

        return response()->json($client);
    }

    // =========================================================================
    // APPOINTMENTS (histórico do cliente)
    // =========================================================================

    /**
     * GET /api/clients/{clientId}/appointments
     */
    public function appointments(string $clientId): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $appointments = Appointment::where('client_id', $client->id)
            ->orderByDesc('starts_at')
            ->get();

        return response()->json($appointments);
    }

    // =========================================================================
    // OBSERVATIONS
    // =========================================================================

    /**
     * GET /api/clients/{clientId}/observations
     *
     * Combina observações manuais + appointment notes numa lista única,
     * ordenadas por created_at DESC (mesma merge-view do Python).
     */
    public function listObservations(string $clientId, Request $request): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $companyId = $request->user()->effectiveCompanyId();
        $professionalId = $request->user()->isProfessional() ? $request->user()->id : null;

        // Manual observations
        $manualObs = collect();
        if (! $professionalId) {
            $manualObs = ClientObservation::where('client_id', $client->id)
                ->where('company_id', $companyId)
                ->with('documents')
                ->get()
                ->map(fn ($o) => [
                    'id'           => $o->id,
                    'client_id'    => $o->client_id,
                    'content'      => $o->content,
                    'source'       => 'manual',
                    'source_label' => null,
                    'documents'    => $o->documents,
                    'created_at'   => $o->created_at,
                ]);
        }

        // Appointment notes
        $apptQuery = Appointment::where('client_id', $client->id)
            ->where('company_id', $companyId)
            ->whereNotNull('notes')
            ->where('notes', '!=', '');

        if ($professionalId) {
            $apptQuery->where('professional_id', $professionalId);
        }

        $apptObs = $apptQuery->get()->map(function ($a) {
            $profName = $a->professional?->name;
            $docs = ClientDocument::where('appointment_id', $a->id)->get();
            return [
                'id'           => $a->id,
                'client_id'    => $a->client_id,
                'content'      => $a->notes,
                'source'       => 'appointment',
                'source_label' => $profName,
                'documents'    => $docs,
                'created_at'   => $a->created_at,
            ];
        });

        // Merge and sort
        $merged = $manualObs->concat($apptObs)
            ->sortByDesc('created_at')
            ->values();

        return response()->json($merged);
    }

    /**
     * POST /api/clients/{clientId}/observations
     */
    public function addObservation(string $clientId, Request $request): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $request->validate(['content' => 'string']);

        $obs = ClientObservation::create([
            'client_id'  => $client->id,
            'company_id' => $request->user()->effectiveCompanyId(),
            'content'    => $request->input('content', ''),
        ]);

        return response()->json($obs, 201);
    }

    /**
     * PATCH /api/clients/{clientId}/observations/{obsId}
     */
    public function updateObservation(string $clientId, string $obsId, Request $request): JsonResponse
    {
        $obs = ClientObservation::where('id', $obsId)
            ->where('client_id', $clientId)
            ->where('company_id', $request->user()->effectiveCompanyId())
            ->first();

        if (! $obs) {
            return response()->json(['message' => 'Observação não encontrada.'], 404);
        }

        $request->validate(['content' => 'string']);
        $obs->update(['content' => $request->input('content')]);

        return response()->json($obs);
    }

    /**
     * DELETE /api/clients/{clientId}/observations/{obsId}
     *
     * Hard-delete (mesma regra do Python).
     */
    public function deleteObservation(string $clientId, string $obsId): JsonResponse
    {
        $obs = ClientObservation::where('id', $obsId)
            ->where('client_id', $clientId)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->first();

        if (! $obs) {
            return response()->json(['message' => 'Observação não encontrada.'], 404);
        }

        $obs->delete();

        return response()->json(null, 204);
    }

    // =========================================================================
    // DOCUMENTS
    // =========================================================================

    /**
     * GET /api/clients/{clientId}/documents
     */
    public function listDocuments(string $clientId): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $docs = ClientDocument::where('client_id', $client->id)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->orderByDesc('created_at')
            ->get();

        return response()->json($docs);
    }

    /**
     * POST /api/clients/{clientId}/documents/upload
     *
     * Upload de arquivo para o filesystem local.
     * Path: client-documents/{company_id}/{client_id}/{uuid}.{ext}
     */
    public function uploadDocument(string $clientId, Request $request): JsonResponse
    {
        $client = $this->findClient($clientId);
        if (! $client) {
            return response()->json(['message' => 'Cliente não encontrado.'], 404);
        }

        $request->validate([
            'file'           => ['required', 'file', 'max:10240'], // 10MB max
            'observation_id' => ['nullable', 'uuid'],
            'appointment_id' => ['nullable', 'uuid'],
        ]);

        $file = $request->file('file');
        $companyId = $request->user()->effectiveCompanyId();
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        $storagePath = "client-documents/{$companyId}/{$clientId}/" . Str::random(16) . ".{$ext}";

        // Salvar no disco local
        Storage::disk('local')->put($storagePath, file_get_contents($file));

        $doc = ClientDocument::create([
            'client_id'      => $client->id,
            'company_id'     => $companyId,
            'observation_id' => $request->input('observation_id'),
            'appointment_id' => $request->input('appointment_id'),
            'file_name'      => $file->getClientOriginalName(),
            'file_type'      => $file->getMimeType(),
            'storage_path'   => $storagePath,
            'file_size_bytes' => $file->getSize(),
        ]);

        return response()->json($doc, 201);
    }

    /**
     * GET /api/clients/{clientId}/documents/{docId}/url
     *
     * Gera URL temporária para download (1 hora).
     * Em produção (HostGator), retorna URL via signed route.
     */
    public function documentUrl(string $clientId, string $docId): JsonResponse
    {
        $doc = ClientDocument::where('id', $docId)
            ->where('client_id', $clientId)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->first();

        if (! $doc) {
            return response()->json(['message' => 'Documento não encontrado.'], 404);
        }

        // Gerar URL temporária via signed route
        $url = \URL::temporarySignedRoute(
            'client.document.download',
            now()->addHour(),
            ['docId' => $doc->id]
        );

        return response()->json(['signed_url' => $url]);
    }

    /**
     * DELETE /api/clients/{clientId}/documents/{docId}
     *
     * Remove arquivo do storage + deleta metadata (best-effort no storage).
     */
    public function deleteDocument(string $clientId, string $docId): JsonResponse
    {
        $doc = ClientDocument::where('id', $docId)
            ->where('client_id', $clientId)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->first();

        if (! $doc) {
            return response()->json(['message' => 'Documento não encontrado.'], 404);
        }

        // Best-effort: remover arquivo do storage
        try {
            Storage::disk('local')->delete($doc->storage_path);
        } catch (\Exception $e) {
            report($e);
        }

        $doc->delete();

        return response()->json(null, 204);
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    private function findClient(string $id): ?Client
    {
        return Client::where('id', $id)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->first();
    }
}
