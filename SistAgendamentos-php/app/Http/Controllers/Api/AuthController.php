<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptInviteRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterCompanyRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Mail\PasswordResetMail;
use App\Mail\RegistrationConfirmationMail;
use App\Models\Company;
use App\Models\License;
use App\Models\Professional;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     *
     * Autentica email+senha e retorna token Sanctum + dados do usuário.
     * O frontend usa user_type e company_id para decidir qual navigation stack exibir.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        // Se for profissional, verificar se está ativo
        if ($user->isProfessional()) {
            $professional = $user->professional;
            if (! $professional || $professional->status === 'deleted') {
                return response()->json([
                    'message' => 'Conta desativada.',
                ], 401);
            }
        }

        // Se for empresa, verificar se está ativa
        if ($user->isCompany()) {
            $company = $user->company;
            if (! $company || ! $company->active) {
                return response()->json([
                    'message' => 'Conta desativada.',
                ], 401);
            }
        }

        // Revogar tokens anteriores (um token ativo por vez — mobile)
        $user->tokens()->delete();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'user_type'  => $user->user_type,
            'user_id'    => $user->id,
            'company_id' => $user->effectiveCompanyId(),
            'email'      => $user->email,
        ]);
    }

    /**
     * POST /api/auth/logout
     *
     * Revoga o token atual.
     */
    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout realizado.']);
    }

    /**
     * POST /api/companies/register
     *
     * Registro de empresa com código de licença.
     *
     * Fluxo (idêntico ao Python):
     *   1. Validar licença (existente + não usada)
     *   2. Criar user (auth)
     *   3. Criar company profile (id = user.id)
     *   4. Consumir licença
     *   5. Enviar email de confirmação em background
     *
     * Se o passo 3 falhar, o user criado no passo 2 é deletado (rollback).
     */
    public function register(RegisterCompanyRequest $request): JsonResponse
    {
        // 1. Validar licença
        $license = License::findValidByCode($request->license_code);
        if (! $license) {
            return response()->json([
                'message' => 'Código de licença inválido ou já utilizado.',
            ], 400);
        }

        // 2. Criar user
        $user = User::create([
            'email'     => $request->email,
            'password'  => $request->password,
            'user_type' => 'company',
        ]);

        // 3. Criar company profile
        try {
            $company = Company::create([
                'id'    => $user->id,
                'name'  => $request->name,
                'cnpj'  => $request->cnpjDigits(),
                'phone' => $request->phone,
            ]);
        } catch (\Exception $e) {
            // Rollback: deletar user órfão
            $user->forceDelete();
            return response()->json([
                'message' => 'Não foi possível criar o perfil da empresa: ' . $e->getMessage(),
            ], 400);
        }

        // 4. Consumir licença
        $license->consume($user->id);

        // 5. Email de confirmação (em fila se queue estiver configurada, senão síncrono)
        Mail::to($user->email)->queue(new RegistrationConfirmationMail($company->name));

        // 6. Gerar token e retornar
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'user_type'  => 'company',
            'user_id'    => $user->id,
            'company_id' => $user->id,
            'company'    => $company,
        ], 201);
    }

    /**
     * POST /api/auth/forgot-password
     *
     * Gera token de reset e envia email. Sempre retorna 204 para não
     * vazar se o email existe (mesma abordagem do Python original).
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $user = User::where('email', $request->email)->first();

            if ($user) {
                // Gerar token de reset
                $token = Str::random(64);

                DB::table('password_reset_tokens')->updateOrInsert(
                    ['email' => $user->email],
                    [
                        'token'      => Hash::make($token),
                        'created_at' => now(),
                    ]
                );

                $resetLink = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:8081'))
                    . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

                Mail::to($user->email)->queue(new PasswordResetMail($resetLink));
            }
        } catch (\Exception $e) {
            // Silenciar erros (mesma abordagem do Python)
            report($e);
        }

        return response()->json(null, 204);
    }

    /**
     * POST /api/auth/reset-password
     *
     * Valida token e troca a senha.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Token inválido.'], 400);
        }

        // Verificar expiração (padrão: 1 hora)
        $expirationHours = (int) env('PASSWORD_RESET_EXPIRATION_HOURS', 1);
        if (now()->diffInHours($record->created_at) >= $expirationHours) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Token expirado.'], 400);
        }

        if (! Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Token inválido.'], 400);
        }

        // Atualizar senha
        $user = User::where('email', $request->email)->first();
        if (! $user) {
            return response()->json(['message' => 'Usuário não encontrado.'], 404);
        }

        $user->update(['password' => $request->password]);

        // Limpar token usado
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Revogar todos os tokens Sanctum existentes (forçar re-login)
        $user->tokens()->delete();

        return response()->json(['message' => 'Senha redefinida com sucesso.']);
    }

    /**
     * POST /api/auth/accept-invite
     *
     * Profissional aceita convite: define senha e ativa a conta.
     * Substitui o fluxo de magic link do Supabase Auth.
     */
    public function acceptInvite(AcceptInviteRequest $request): JsonResponse
    {
        $user = User::where('invite_token', $request->token)
            ->where('user_type', 'professional')
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Token de convite inválido.'], 400);
        }

        if ($user->invite_token_expires_at && $user->invite_token_expires_at->isPast()) {
            return response()->json(['message' => 'Token de convite expirado.'], 400);
        }

        // Definir senha
        $user->update([
            'password'                => $request->password,
            'invite_token'            => null,
            'invite_token_expires_at' => null,
            'email_verified_at'       => now(),
        ]);

        // Ativar profissional (pending → active)
        $professional = $user->professional;
        if ($professional && $professional->status === 'pending') {
            $professional->update([
                'active' => true,
                'status' => 'active',
            ]);
        }

        // Gerar token de acesso
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'user_type'  => 'professional',
            'user_id'    => $user->id,
            'company_id' => $user->company_id,
            'message'    => 'Conta ativada com sucesso.',
        ]);
    }

    /**
     * GET /api/auth/me
     *
     * Retorna dados do usuário autenticado.
     * O frontend pode chamar isso após login para obter o perfil completo.
     */
    public function me(): JsonResponse
    {
        $user = request()->user();

        $data = [
            'user_id'    => $user->id,
            'email'      => $user->email,
            'user_type'  => $user->user_type,
            'company_id' => $user->effectiveCompanyId(),
        ];

        if ($user->isCompany()) {
            $data['company'] = $user->company;
        } else {
            $data['professional'] = $user->professional?->load('specialties');
        }

        return response()->json($data);
    }
}
