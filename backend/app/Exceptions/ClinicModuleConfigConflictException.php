<?php

namespace App\Exceptions;

use App\Models\ClinicModuleConfig;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicModuleConfigConflictException extends Exception
{
    public function __construct(
        protected int $currentRevision,
        protected int $suppliedRevision,
        protected ClinicModuleConfig $currentConfig,
        string $message = 'Configuration conflict. The configuration has been modified by another user.'
    ) {
        parent::__construct($message, 409);
    }

    public function getCurrentRevision(): int
    {
        return $this->currentRevision;
    }

    public function getSuppliedRevision(): int
    {
        return $this->suppliedRevision;
    }

    public function getCurrentConfig(): ClinicModuleConfig
    {
        return $this->currentConfig;
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message'           => $this->getMessage(),
            'current_revision'  => $this->currentRevision,
            'supplied_revision' => $this->suppliedRevision,
            'config'            => $this->currentConfig,
        ], 409);
    }
}
