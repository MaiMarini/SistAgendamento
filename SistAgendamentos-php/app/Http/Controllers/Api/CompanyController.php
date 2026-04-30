<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateTimeBlockRequest;
use App\Http\Requests\SaveAvailabilityRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Models\Company;
use App\Models\CompanyAvailability;
use App\Models\CompanyTimeBlock;
use Illuminate\Http\JsonResponse;

class CompanyController extends Controller
{
    /**
     * GET /api/companies/me
     *
     * Retorna o perfil da empresa autenticada.
     * Email é injetado do user (não está na tabela company — mesma lógica do Python).
     */
    public function show(): JsonResponse
    {
        $user = request()->user();
        $company = $user->company;

        if (! $company) {
            return response()->json(['message' => 'Perfil de empresa não encontrado.'], 404);
        }

        $data = $company->toArray();
        $data['email'] = $user->email;

        return response()->json($data);
    }

    /**
     * PATCH /api/companies/me
     *
     * Atualização parcial — só os campos enviados são alterados.
     */
    public function update(UpdateCompanyRequest $request): JsonResponse
    {
        $user = request()->user();
        $company = $user->company;

        $company->update($request->validated());

        $data = $company->fresh()->toArray();
        $data['email'] = $user->email;

        return response()->json($data);
    }

    // =========================================================================
    // AVAILABILITY (horários comerciais)
    // =========================================================================

    /**
     * GET /api/companies/me/availability
     */
    public function listAvailability(): JsonResponse
    {
        $slots = CompanyAvailability::where('company_id', request()->user()->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($slots);
    }

    /**
     * PUT /api/companies/me/availability
     *
     * Bulk replace — deleta todos os slots existentes e insere os novos.
     * Mesmo comportamento do Python original (DELETE all + INSERT).
     */
    public function saveAvailability(SaveAvailabilityRequest $request): JsonResponse
    {
        $companyId = request()->user()->id;

        // Delete all existing
        CompanyAvailability::where('company_id', $companyId)->delete();

        // Insert new slots
        $slots = [];
        foreach ($request->validated()['slots'] as $slot) {
            $slots[] = CompanyAvailability::create([
                'company_id'  => $companyId,
                'day_of_week' => $slot['day_of_week'],
                'start_time'  => $slot['start_time'],
                'end_time'    => $slot['end_time'],
            ]);
        }

        return response()->json($slots);
    }

    // =========================================================================
    // TIME BLOCKS (bloqueios/fechamentos)
    // =========================================================================

    /**
     * GET /api/companies/me/time-blocks
     */
    public function listTimeBlocks(): JsonResponse
    {
        $blocks = CompanyTimeBlock::where('company_id', request()->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($blocks);
    }

    /**
     * POST /api/companies/me/time-blocks
     */
    public function createTimeBlock(CreateTimeBlockRequest $request): JsonResponse
    {
        $block = CompanyTimeBlock::create([
            'company_id'           => request()->user()->id,
            'is_recurring'         => $request->boolean('is_recurring'),
            'starts_at'            => $request->input('starts_at'),
            'ends_at'              => $request->input('ends_at'),
            'recurring_start_time' => $request->input('recurring_start_time'),
            'recurring_end_time'   => $request->input('recurring_end_time'),
            'reason'               => $request->input('reason'),
        ]);

        return response()->json($block, 201);
    }

    /**
     * DELETE /api/companies/me/time-blocks/{blockId}
     */
    public function deleteTimeBlock(string $blockId): JsonResponse
    {
        $deleted = CompanyTimeBlock::where('id', $blockId)
            ->where('company_id', request()->user()->id)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Bloqueio não encontrado.'], 404);
        }

        return response()->json(null, 204);
    }
}
