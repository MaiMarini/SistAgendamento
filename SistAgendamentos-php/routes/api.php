<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\ProfessionalController;
use App\Http\Controllers\Api\SpecialtyController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — prefixo automático /api
|--------------------------------------------------------------------------
*/

// Health check
Route::get('/health', fn () => response()->json(['status' => 'ok']));

// =========================================================================
// DEPLOY — webhook protegido por segredo (git pull + limpeza de cache)
// Dispare com:
//   curl -X POST https://api.kallme.com.br/api/deploy -H "X-Deploy-Secret: SEU_SEGREDO"
// Ou ligue um webhook do GitHub (push) apontando para:
//   https://api.kallme.com.br/api/deploy?secret=SEU_SEGREDO
// =========================================================================
Route::post('/deploy', function (\Illuminate\Http\Request $request) {
    $secret   = config('deploy.secret');
    $provided = $request->header('X-Deploy-Secret') ?: $request->input('secret');

    // hash_equals em tempo constante; só prossegue se o segredo estiver configurado.
    if (! $secret || ! is_string($provided) || ! hash_equals($secret, $provided)) {
        return response()->json(['ok' => false, 'message' => 'Não autorizado.'], 403);
    }

    $repoPath = config('deploy.repo_path') ?: base_path();
    $branch   = config('deploy.branch', 'master');
    $php      = config('deploy.php_binary', 'php');

    $log = [];
    // Nenhum dado da request entra nos comandos — apenas valores fixos de config
    // (escapados), evitando injeção de shell.
    $run = function (string $cmd) use ($repoPath, &$log): int {
        $log[] = '$ ' . $cmd;
        $out   = [];
        $code  = 0;
        exec('cd ' . escapeshellarg($repoPath) . ' && ' . $cmd . ' 2>&1', $out, $code);
        foreach ($out as $line) {
            $log[] = $line;
        }
        return $code;
    };

    // 1. git pull (crítico — falha aborta o deploy)
    if ($run('git pull origin ' . escapeshellarg($branch)) !== 0) {
        return response()->json(['ok' => false, 'step' => 'git pull', 'log' => $log], 500);
    }

    // 2. limpar caches (best-effort — não derruba o deploy se o PHP CLI não resolver)
    $run($php . ' artisan optimize:clear');

    return response()->json(['ok' => true, 'log' => $log]);
});

// =========================================================================
// AUTH — rotas públicas (sem autenticação)
// =========================================================================
Route::post('/auth/login',           [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password',  [AuthController::class, 'resetPassword']);
Route::post('/auth/accept-invite',   [AuthController::class, 'acceptInvite']);

// Registro de empresa (público, requer código de licença)
Route::post('/companies/register', [AuthController::class, 'register']);

// =========================================================================
// Rotas protegidas (requerem token Sanctum)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ----- Company -----
    Route::get('/companies/me',    [CompanyController::class, 'show']);
    Route::patch('/companies/me',  [CompanyController::class, 'update']);

    Route::get('/companies/me/availability', [CompanyController::class, 'listAvailability']);
    Route::put('/companies/me/availability', [CompanyController::class, 'saveAvailability']);

    Route::get('/companies/me/time-blocks',              [CompanyController::class, 'listTimeBlocks']);
    Route::post('/companies/me/time-blocks',             [CompanyController::class, 'createTimeBlock']);
    Route::delete('/companies/me/time-blocks/{blockId}', [CompanyController::class, 'deleteTimeBlock']);

    // ----- Specialties -----
    Route::get('/specialties',                  [SpecialtyController::class, 'index']);
    Route::post('/specialties',                 [SpecialtyController::class, 'store']);
    Route::delete('/specialties/{specialtyId}', [SpecialtyController::class, 'destroy']);

    // ----- Professionals -----
    Route::post('/professionals',     [ProfessionalController::class, 'store']);
    Route::get('/professionals',      [ProfessionalController::class, 'index']);
    Route::get('/professionals/all-time-blocks', [ProfessionalController::class, 'allTimeBlocks']);

    // Professional self-service (o próprio profissional autenticado)
    Route::post('/professionals/me/activate',     [ProfessionalController::class, 'activateSelf']);
    Route::get('/professionals/me/availability',  [ProfessionalController::class, 'listMyAvailability']);
    Route::put('/professionals/me/availability',  [ProfessionalController::class, 'saveMyAvailability']);
    Route::get('/professionals/me/time-blocks',            [ProfessionalController::class, 'listMyTimeBlocks']);
    Route::post('/professionals/me/time-blocks',           [ProfessionalController::class, 'createMyTimeBlock']);
    Route::delete('/professionals/me/time-blocks/{blockId}', [ProfessionalController::class, 'deleteMyTimeBlock']);

    // Professional by ID (company manages)
    Route::get('/professionals/{professionalId}',    [ProfessionalController::class, 'show']);
    Route::patch('/professionals/{professionalId}',  [ProfessionalController::class, 'update']);
    Route::delete('/professionals/{professionalId}', [ProfessionalController::class, 'destroy']);
    Route::post('/professionals/{professionalId}/resend-invite', [ProfessionalController::class, 'resendInvite']);

    Route::get('/professionals/{professionalId}/availability', [ProfessionalController::class, 'listAvailability']);
    Route::put('/professionals/{professionalId}/availability', [ProfessionalController::class, 'saveAvailability']);

    Route::get('/professionals/{professionalId}/time-blocks',              [ProfessionalController::class, 'listTimeBlocks']);
    Route::post('/professionals/{professionalId}/time-blocks',             [ProfessionalController::class, 'createTimeBlock']);
    Route::delete('/professionals/{professionalId}/time-blocks/{blockId}', [ProfessionalController::class, 'deleteTimeBlock']);

    Route::get('/professionals/{professionalId}/available-slots',      [ProfessionalController::class, 'availableSlots']);
    Route::get('/professionals/{professionalId}/month-availability',   [ProfessionalController::class, 'monthAvailability']);

    // ----- Clients -----
    Route::get('/clients',              [ClientController::class, 'index']);
    Route::post('/clients',             [ClientController::class, 'store']);
    Route::patch('/clients/{clientId}', [ClientController::class, 'update']);
    Route::delete('/clients/{clientId}', [ClientController::class, 'destroy']);

    Route::get('/clients/{clientId}/appointments', [ClientController::class, 'appointments']);

    Route::get('/clients/{clientId}/observations',             [ClientController::class, 'listObservations']);
    Route::post('/clients/{clientId}/observations',            [ClientController::class, 'addObservation']);
    Route::patch('/clients/{clientId}/observations/{obsId}',   [ClientController::class, 'updateObservation']);
    Route::delete('/clients/{clientId}/observations/{obsId}',  [ClientController::class, 'deleteObservation']);

    Route::get('/clients/{clientId}/documents',                    [ClientController::class, 'listDocuments']);
    Route::post('/clients/{clientId}/documents/upload',            [ClientController::class, 'uploadDocument']);
    Route::get('/clients/{clientId}/documents/{docId}/url',        [ClientController::class, 'documentUrl']);
    Route::delete('/clients/{clientId}/documents/{docId}',         [ClientController::class, 'deleteDocument']);

    // ----- Appointments -----
    Route::get('/appointments',                         [AppointmentController::class, 'index']);
    Route::post('/appointments',                        [AppointmentController::class, 'store']);
    Route::patch('/appointments/{appointmentId}',       [AppointmentController::class, 'update']);
    Route::delete('/appointments/{appointmentId}/notes', [AppointmentController::class, 'clearNotes']);

    // Reminders (cron endpoint)
    Route::post('/companies/me/reminders/process', [AppointmentController::class, 'processReminders']);
});
