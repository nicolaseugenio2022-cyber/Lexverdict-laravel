<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('normalized_name');
            $table->string('law_reference')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('normalized_name');
            $table->index('is_active');
        });

        Schema::create('docket_counters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('region', 16);
            $table->string('office', 16);
            $table->string('type_code', 16);
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->unsignedInteger('last_serial')->default(0);
            $table->timestamps();

            $table->unique(['region', 'office', 'type_code', 'year', 'month'], 'docket_counters_scope_unique');
        });

        Schema::create('cases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('docket_number', 64)->unique();
            $table->date('date');
            $table->timestampTz('hearing_date_1')->nullable();
            $table->timestampTz('hearing_date_2')->nullable();
            $table->string('police_station');
            $table->uuid('assigned_prosecutor_id');
            $table->uuid('created_by_user_id');
            $table->string('subpoena_status', 32)->default('Pending');
            $table->string('pin_hash');
            $table->timestampTz('pin_issued_at');
            $table->timestampTz('pin_reset_at')->nullable();
            $table->unsignedInteger('revision_number')->default(1);
            $table->timestamps();

            $table->foreign('assigned_prosecutor_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['assigned_prosecutor_id', 'subpoena_status']);
            $table->index(['created_by_user_id', 'subpoena_status']);
            $table->index('date');
            $table->index('police_station');
        });

        Schema::create('case_offenses', function (Blueprint $table) {
            $table->uuid('case_id');
            $table->uuid('offense_id');
            $table->timestamps();

            $table->primary(['case_id', 'offense_id']);
            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('offense_id')->references('id')->on('offenses')->restrictOnDelete();
        });

        Schema::create('persons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex', 16);
            $table->timestamps();

            $table->index(['last_name', 'first_name']);
        });

        Schema::create('case_parties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id');
            $table->uuid('person_id')->nullable();
            $table->string('role', 32);
            $table->unsignedInteger('position')->default(1);
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex', 16);
            $table->string('street');
            $table->string('barangay');
            $table->string('municipality');
            $table->string('province');
            $table->string('region');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('person_id')->references('id')->on('persons')->nullOnDelete();
            $table->unique(['case_id', 'role', 'position']);
            $table->index(['case_id', 'role']);
        });

        Schema::create('subpoena_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id');
            $table->unsignedInteger('revision_number');
            $table->jsonb('payload');
            $table->uuid('submitted_by');
            $table->timestampTz('submitted_at');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('submitted_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['case_id', 'revision_number']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE cases ADD CONSTRAINT cases_subpoena_status_check CHECK (subpoena_status IN ('Pending', 'Approved', 'Denied'))");
            DB::statement('ALTER TABLE cases ADD CONSTRAINT cases_hearing_date_order_check CHECK (hearing_date_2 IS NULL OR hearing_date_1 IS NULL OR hearing_date_2 > hearing_date_1)');
            DB::statement("ALTER TABLE case_parties ADD CONSTRAINT case_parties_role_check CHECK (role IN ('Complainant', 'Respondent'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subpoena_revisions');
        Schema::dropIfExists('case_parties');
        Schema::dropIfExists('persons');
        Schema::dropIfExists('case_offenses');
        Schema::dropIfExists('cases');
        Schema::dropIfExists('docket_counters');
        Schema::dropIfExists('offenses');
    }
};
