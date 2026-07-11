<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subpoena_decisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id');
            $table->unsignedInteger('revision_number');
            $table->string('decision', 32);
            $table->string('comment_type', 32)->nullable();
            $table->text('comment')->nullable();
            $table->uuid('decided_by');
            $table->timestampTz('decided_at');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('decided_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['case_id', 'revision_number']);
            $table->index(['decided_by', 'decided_at']);
            $table->index(['case_id', 'decided_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE subpoena_decisions ADD CONSTRAINT subpoena_decisions_value_check CHECK (decision IN ('Approved', 'Denied'))");
            DB::statement("ALTER TABLE subpoena_decisions ADD CONSTRAINT subpoena_decisions_comment_check CHECK ((decision = 'Denied' AND comment_type = 'Subpoena' AND comment IS NOT NULL AND btrim(comment) <> '') OR (decision = 'Approved' AND comment_type IS NULL AND comment IS NULL))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subpoena_decisions');
    }
};
