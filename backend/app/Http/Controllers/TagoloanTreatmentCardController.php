<?php

namespace App\Http\Controllers;

use App\Http\Requests\Clinical\StoreTagoloanTreatmentCardRequest;
use App\Services\Clinical\TagoloanTreatmentCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagoloanTreatmentCardController extends Controller
{
    public function __construct(
        protected TagoloanTreatmentCardService $cardService
    ) {}

    /**
     * Display a listing of treatment cards
     */
    public function index(Request $request): JsonResponse
    {
        $cards = $this->cardService->getPaginatedCards(
            $request->user()->clinic_id,
            $request->query('search'),
            (int) $request->get('per_page', 20)
        );

        return $this->json($cards);
    }

    /**
     * Smart pre-fill endpoint for Tagoloan Treatment Card
     */
    public function getPatientCardData(Request $request, int $patientId): JsonResponse
    {
        $data = $this->cardService->getPatientCardData(
            $request->user()->clinic_id,
            $patientId,
            $request->query('bite_id') ? (int) $request->query('bite_id') : null
        );

        return $this->json($data);
    }

    /**
     * Store or Update a Tagoloan Treatment Card
     */
    public function store(StoreTagoloanTreatmentCardRequest $request): JsonResponse
    {
        $result = $this->cardService->storeCard(
            $request->user()->clinic_id,
            $request->validated(),
            $request->user(),
            $request->all()
        );

        return $this->json($result['data'], $result['status']);
    }

    /**
     * Show a single treatment card
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $card = $this->cardService->getCard($request->user()->clinic_id, $id);

        return $this->json($card);
    }
}
