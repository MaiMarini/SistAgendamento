<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateSpecialtyRequest;
use App\Models\Specialty;
use Illuminate\Http\JsonResponse;

class SpecialtyController extends Controller
{
    /**
     * GET /api/specialties
     *
     * Lista especialidades da empresa autenticada.
     */
    public function index(): JsonResponse
    {
        $specialties = Specialty::where('company_id', request()->user()->effectiveCompanyId())
            ->orderBy('name')
            ->get();

        return response()->json($specialties);
    }

    /**
     * POST /api/specialties
     */
    public function store(CreateSpecialtyRequest $request): JsonResponse
    {
        $specialty = Specialty::create([
            'company_id' => request()->user()->effectiveCompanyId(),
            'name'       => $request->name,
            'info'       => $request->info,
        ]);

        return response()->json($specialty, 201);
    }

    /**
     * DELETE /api/specialties/{specialtyId}
     */
    public function destroy(string $specialtyId): JsonResponse
    {
        $deleted = Specialty::where('id', $specialtyId)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Especialidade não encontrada.'], 404);
        }

        return response()->json(null, 204);
    }
}
