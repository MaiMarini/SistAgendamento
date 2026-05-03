<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateProfessionalRequest;
use App\Http\Requests\CreateTimeBlockRequest;
use App\Http\Requests\SaveAvailabilityRequest;
use App\Http\Requests\UpdateProfessionalRequest;
use App\Mail\ProfessionalInviteMail;
use App\Models\Availability;
use App\Models\Company;
use App\Models\Professional;
use App\Models\TimeBlock;
use App\Models\User;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ProfessionalController extends Controller
{
    public function __construct(
        private AvailabilityService $availabilityService,
    ) {}

    // =========================================================================
    // CRUD
    // =========================================================================

    /**
     * POST /api/professionals
     *
     * Cria profissional + user auth + envia email de convite.
     * Porta fiel do create_professional do Python.
     */
    public function store(CreateProfessionalRequest $request): JsonResponse
    {
        $user = request()->user();
        $companyId = $user->effectiveCompanyId();

        // Cleanup conflitos com profissionais deletados (mesmo email/cpf)
        $this->cleanupDeletedConflicts($companyId, $request->email, $request->cpf);

        // Verificar email único na empresa (entre não-deletados)
        $exists = Professional::forCompany($companyId)
            ->notDeleted()
            ->where('email', $request->email)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Já existe um profissional com este email.'], 400);
        }

        // Verificar email único na tabela users
        if (User::where('email', $request->email)->exists()) {
            return response()->json(['message' => 'Este email já está cadastrado no sistema.'], 400);
        }

        // Gerar invite token
        $inviteToken = Str::random(64);
        $expirationHours = (int) env('INVITE_LINK_EXPIRATION_HOURS', 24);

        // Criar user auth (senha temporária aleatória — será substituída ao aceitar convite)
        $profUser = User::create([
            'email'                   => $request->email,
            'password'                => Str::random(32),
            'user_type'               => 'professional',
            'company_id'              => $companyId,
            'invite_token'            => $inviteToken,
            'invite_token_expires_at' => now()->addHours($expirationHours),
        ]);

        // Criar professional profile
        try {
            $professional = Professional::create([
                'id'                       => $profUser->id,
                'company_id'               => $companyId,
                'name'                     => $request->name,
                'email'                    => $request->email,
                'cpf'                      => $request->cpf,
                'phone'                    => $request->phone,
                'photo_url'                => $request->photo_url,
                'color'                    => $request->color,
                'default_duration_minutes' => $request->input('default_duration_minutes', 60),
                'active'                   => false,
                'status'                   => 'pending',
            ]);
        } catch (\Exception $e) {
            $profUser->forceDelete();
            return response()->json([
                'message' => 'Não foi possível criar o profissional: ' . $e->getMessage(),
            ], 400);
        }

        // Atribuir especialidades
        if ($request->has('specialty_ids') && ! empty($request->specialty_ids)) {
            $professional->specialties()->sync($request->specialty_ids);
        }

        // Enviar email de convite
        $inviteLink = env('FRONTEND_URL', 'http://localhost:8081')
            . '?type=invite&token=' . $inviteToken;
        $companyName = Company::find($companyId)?->name ?? '';

        Mail::to($request->email)->send(
            new ProfessionalInviteMail($request->name, $companyName, $inviteLink)
        );

        return response()->json(
            $professional->load('specialties'),
            201
        );
    }

    /**
     * GET /api/professionals
     */
    public function index(): JsonResponse
    {
        $companyId = request()->user()->effectiveCompanyId();

        $professionals = Professional::forCompany($companyId)
            ->notDeleted()
            ->with('specialties')
            ->orderBy('name')
            ->get();

        return response()->json($professionals);
    }

    /**
     * GET /api/professionals/{professionalId}
     */
    public function show(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        return response()->json($professional->load('specialties'));
    }

    /**
     * PATCH /api/professionals/{professionalId}
     *
     * Lógica de sync active/status idêntica ao Python:
     *   active=true  → status='active'
     *   active=false + status!='pending' → status='inactive'
     */
    public function update(string $professionalId, UpdateProfessionalRequest $request): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        $data = $request->validated();

        // Sync active/status
        if (isset($data['active'])) {
            if ($data['active']) {
                $data['status'] = 'active';
            } elseif ($professional->status !== 'pending') {
                $data['status'] = 'inactive';
            }
        }

        // Se mudou email, atualizar também na tabela users
        if (isset($data['email']) && $data['email'] !== $professional->email) {
            $profUser = User::find($professional->id);
            if ($profUser) {
                $profUser->update(['email' => $data['email']]);
            }
        }

        $professional->update($data);

        // Sync especialidades se fornecidas
        if (isset($data['specialty_ids'])) {
            $professional->specialties()->sync($data['specialty_ids']);
            unset($data['specialty_ids']);
        }

        return response()->json($professional->fresh()->load('specialties'));
    }

    /**
     * DELETE /api/professionals/{professionalId}
     *
     * Soft-delete: status='deleted', active=false, email→placeholder, cpf→null.
     * NÃO deleta o user auth (apenas muda email para placeholder).
     */
    public function destroy(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        // Verificar se tem appointments
        $hasAppointments = $professional->appointments()
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->exists();

        if ($hasAppointments) {
            return response()->json([
                'message' => 'Não é possível excluir um profissional com agendamentos pendentes.',
            ], 400);
        }

        $placeholder = "deleted_{$professional->id}@placeholder.invalid";

        $professional->update([
            'status' => 'deleted',
            'active' => false,
            'email'  => $placeholder,
            'cpf'    => null,
        ]);

        // Atualizar email no user auth também
        $profUser = User::find($professional->id);
        if ($profUser) {
            $profUser->update(['email' => $placeholder]);
        }

        return response()->json(null, 204);
    }

    // =========================================================================
    // INVITE / ACTIVATE
    // =========================================================================

    /**
     * POST /api/professionals/{professionalId}/resend-invite
     */
    public function resendInvite(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        if ($professional->status !== 'pending') {
            return response()->json(['message' => 'Apenas profissionais pendentes podem receber convite.'], 400);
        }

        // Gerar novo token
        $inviteToken = Str::random(64);
        $expirationHours = (int) env('INVITE_LINK_EXPIRATION_HOURS', 24);

        $profUser = User::find($professional->id);
        $profUser->update([
            'invite_token'            => $inviteToken,
            'invite_token_expires_at' => now()->addHours($expirationHours),
        ]);

        $inviteLink = env('FRONTEND_URL', 'http://localhost:8081')
            . '?type=invite&token=' . $inviteToken;
        $companyName = Company::find(request()->user()->effectiveCompanyId())?->name ?? '';

        Mail::to($profUser->email)->send(
            new ProfessionalInviteMail($professional->name, $companyName, $inviteLink)
        );

        return response()->json(['message' => 'Convite reenviado com sucesso.']);
    }

    /**
     * POST /api/professionals/me/activate
     *
     * Chamado pelo profissional após definir senha. Transition: pending → active.
     */
    public function activateSelf(): JsonResponse
    {
        $user = request()->user();
        $professional = $user->professional;

        if (! $professional) {
            return response()->json(['message' => 'Perfil de profissional não encontrado.'], 404);
        }

        if ($professional->status === 'pending') {
            $professional->update([
                'active' => true,
                'status' => 'active',
            ]);
        }

        return response()->json(null, 204);
    }

    // =========================================================================
    // AVAILABILITY
    // =========================================================================

    /**
     * GET /api/professionals/me/availability
     */
    public function listMyAvailability(): JsonResponse
    {
        return $this->listAvailabilityFor(request()->user()->id);
    }

    /**
     * PUT /api/professionals/me/availability
     */
    public function saveMyAvailability(SaveAvailabilityRequest $request): JsonResponse
    {
        return $this->saveAvailabilityFor(request()->user()->id, $request);
    }

    /**
     * GET /api/professionals/{professionalId}/availability
     */
    public function listAvailability(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }
        return $this->listAvailabilityFor($professionalId);
    }

    /**
     * PUT /api/professionals/{professionalId}/availability
     */
    public function saveAvailability(string $professionalId, SaveAvailabilityRequest $request): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }
        return $this->saveAvailabilityFor($professionalId, $request);
    }

    // =========================================================================
    // TIME BLOCKS
    // =========================================================================

    /**
     * GET /api/professionals/me/time-blocks
     */
    public function listMyTimeBlocks(): JsonResponse
    {
        return $this->listTimeBlocksFor(request()->user()->id);
    }

    /**
     * POST /api/professionals/me/time-blocks
     */
    public function createMyTimeBlock(CreateTimeBlockRequest $request): JsonResponse
    {
        return $this->createTimeBlockFor(request()->user()->id, $request);
    }

    /**
     * DELETE /api/professionals/me/time-blocks/{blockId}
     */
    public function deleteMyTimeBlock(string $blockId): JsonResponse
    {
        return $this->deleteTimeBlockFor(request()->user()->id, $blockId);
    }

    /**
     * GET /api/professionals/{professionalId}/time-blocks
     */
    public function listTimeBlocks(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }
        return $this->listTimeBlocksFor($professionalId);
    }

    /**
     * POST /api/professionals/{professionalId}/time-blocks
     */
    public function createTimeBlock(string $professionalId, CreateTimeBlockRequest $request): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }
        return $this->createTimeBlockFor($professionalId, $request);
    }

    /**
     * DELETE /api/professionals/{professionalId}/time-blocks/{blockId}
     */
    public function deleteTimeBlock(string $professionalId, string $blockId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }
        return $this->deleteTimeBlockFor($professionalId, $blockId);
    }

    /**
     * GET /api/professionals/all-time-blocks
     */
    public function allTimeBlocks(): JsonResponse
    {
        $companyId = request()->user()->effectiveCompanyId();
        $professionalIds = Professional::forCompany($companyId)->notDeleted()->pluck('id');

        $blocks = TimeBlock::whereIn('professional_id', $professionalIds)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($blocks);
    }

    // =========================================================================
    // AVAILABLE SLOTS / MONTH AVAILABILITY
    // =========================================================================

    /**
     * GET /api/professionals/{professionalId}/available-slots?date=YYYY-MM-DD
     */
    public function availableSlots(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        $date = request()->query('date');
        if (! $date) {
            return response()->json(['message' => 'Parâmetro date é obrigatório (YYYY-MM-DD).'], 400);
        }

        $slots = $this->availabilityService->getAvailableSlots(
            $professionalId,
            request()->user()->effectiveCompanyId(),
            $date,
            $professional->default_duration_minutes,
        );

        return response()->json($slots);
    }

    /**
     * GET /api/professionals/{professionalId}/month-availability?year=2024&month=3
     */
    public function monthAvailability(string $professionalId): JsonResponse
    {
        $professional = $this->findProfessional($professionalId);
        if (! $professional) {
            return response()->json(['message' => 'Profissional não encontrado.'], 404);
        }

        $year = (int) request()->query('year');
        $month = (int) request()->query('month');

        if (! $year || ! $month || $month < 1 || $month > 12) {
            return response()->json(['message' => 'Parâmetros year e month são obrigatórios.'], 400);
        }

        $result = $this->availabilityService->getMonthAvailability(
            $professionalId,
            request()->user()->effectiveCompanyId(),
            $year,
            $month,
            $professional->default_duration_minutes,
        );

        return response()->json($result);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private function findProfessional(string $id): ?Professional
    {
        $companyId = request()->user()->effectiveCompanyId();
        return Professional::forCompany($companyId)->notDeleted()->find($id);
    }

    private function cleanupDeletedConflicts(string $companyId, string $email, ?string $cpf): void
    {
        Professional::forCompany($companyId)
            ->where('status', 'deleted')
            ->where('email', $email)
            ->update([
                'email' => \DB::raw("CONCAT('deleted_', id, '@placeholder.invalid')"),
                'cpf'   => null,
            ]);

        if ($cpf) {
            Professional::forCompany($companyId)
                ->where('status', 'deleted')
                ->where('cpf', $cpf)
                ->update(['cpf' => null]);
        }
    }

    private function listAvailabilityFor(string $professionalId): JsonResponse
    {
        $slots = Availability::where('professional_id', $professionalId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($slots);
    }

    private function saveAvailabilityFor(string $professionalId, SaveAvailabilityRequest $request): JsonResponse
    {
        Availability::where('professional_id', $professionalId)->delete();

        $slots = [];
        foreach ($request->validated()['slots'] as $slot) {
            $slots[] = Availability::create([
                'professional_id' => $professionalId,
                'day_of_week'     => $slot['day_of_week'],
                'start_time'      => $slot['start_time'],
                'end_time'        => $slot['end_time'],
            ]);
        }

        return response()->json($slots);
    }

    private function listTimeBlocksFor(string $professionalId): JsonResponse
    {
        $blocks = TimeBlock::where('professional_id', $professionalId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($blocks);
    }

    private function createTimeBlockFor(string $professionalId, CreateTimeBlockRequest $request): JsonResponse
    {
        $block = TimeBlock::create([
            'professional_id'      => $professionalId,
            'is_recurring'         => $request->boolean('is_recurring'),
            'starts_at'            => $request->input('starts_at'),
            'ends_at'              => $request->input('ends_at'),
            'recurring_start_time' => $request->input('recurring_start_time'),
            'recurring_end_time'   => $request->input('recurring_end_time'),
            'reason'               => $request->input('reason'),
        ]);

        return response()->json($block, 201);
    }

    private function deleteTimeBlockFor(string $professionalId, string $blockId): JsonResponse
    {
        $block = TimeBlock::where('id', $blockId)
            ->where('professional_id', $professionalId)
            ->first();

        if (! $block) {
            return response()->json(['message' => 'Bloqueio não encontrado.'], 404);
        }

        $block->delete();
        return response()->json($block);
    }
}
