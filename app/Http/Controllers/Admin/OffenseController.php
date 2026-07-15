<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Cases\Actions\ManageOffense;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OffenseIndexRequest;
use App\Http\Requests\Admin\StoreOffenseRequest;
use App\Http\Requests\Admin\UpdateOffenseRequest;
use App\Models\Offense;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class OffenseController extends Controller
{
    public function index(OffenseIndexRequest $request): Response
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['search'] ?? ''));
        $status = (string) ($filters['status'] ?? '');

        $offenses = Offense::query()
            ->withCount('cases')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->whereRaw('name ILIKE ?', ["%{$search}%"])
                        ->orWhereRaw("COALESCE(law_reference, '') ILIKE ?", ["%{$search}%"]);
                });
            })
            ->when($status !== '', fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Offense $offense): array => $this->payload($offense));

        return Inertia::render('Admin/Offenses/Index', [
            'offenses' => $offenses,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function store(StoreOffenseRequest $request, ManageOffense $manager): RedirectResponse
    {
        try {
            $manager->create(
                $request->string('name')->toString(),
                $request->string('law_reference')->toString() ?: null,
                $request->user(),
            );
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['name' => $exception->getMessage()])->withInput();
        }

        return redirect()->back(fallback: route('admin.offenses.index'));
    }

    public function update(UpdateOffenseRequest $request, string $offenseId, ManageOffense $manager): RedirectResponse
    {
        $offense = Offense::query()->findOrFail($offenseId);
        $this->authorize('update', $offense);

        try {
            $manager->update(
                $offense,
                $request->string('name')->toString(),
                $request->string('law_reference')->toString() ?: null,
                $request->user(),
            );
        } catch (CaseDataInvariantException $exception) {
            return back()->withErrors(['name' => $exception->getMessage()])->withInput();
        }

        return redirect()->back(fallback: route('admin.offenses.index'));
    }

    public function deactivate(string $offenseId, ManageOffense $manager): RedirectResponse
    {
        $offense = Offense::query()->findOrFail($offenseId);
        $this->authorize('update', $offense);

        $manager->setActive($offense, false, request()->user());

        return redirect()->back(fallback: route('admin.offenses.index'));
    }

    public function restore(string $offenseId, ManageOffense $manager): RedirectResponse
    {
        $offense = Offense::query()->findOrFail($offenseId);
        $this->authorize('update', $offense);

        $manager->setActive($offense, true, request()->user());

        return redirect()->back(fallback: route('admin.offenses.index'));
    }

    /** @return array{id: string, name: string, law_reference: string|null, is_active: bool, cases_count: int} */
    private function payload(Offense $offense): array
    {
        return [
            'id' => $offense->id,
            'name' => $offense->name,
            'law_reference' => $offense->law_reference,
            'is_active' => $offense->is_active,
            'cases_count' => $offense->cases_count,
        ];
    }
}
