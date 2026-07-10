<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix', 8)->nullable();
            $table->string('sex', 16)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('prosecutor_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->string('license_number')->nullable();
            $table->string('office_number')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('prosecutor_secretary_assignments', function (Blueprint $table) {
            $table->uuid('prosecutor_user_id')->primary();
            $table->uuid('secretary_user_id')->unique();
            $table->uuid('assigned_by');
            $table->timestampTz('assigned_at');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('prosecutor_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('secretary_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('assigned_by')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('prosecutor_secretary_assignment_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('prosecutor_user_id');
            $table->uuid('secretary_user_id');
            $table->timestampTz('effective_from');
            $table->timestampTz('effective_until')->nullable();
            $table->uuid('changed_by');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('prosecutor_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('secretary_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type');
            $table->uuid('actor_user_id')->nullable();
            $table->string('subject_type')->nullable();
            $table->uuid('subject_id')->nullable();
            $table->jsonb('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->uuid('correlation_id')->nullable();
            $table->timestampTz('occurred_at');
            $table->timestamps();

            $table->foreign('actor_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['actor_user_id', 'occurred_at']);
            $table->index(['subject_type', 'subject_id', 'occurred_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_suffix_check CHECK (suffix IS NULL OR suffix IN ('Jr.', 'Sr.', 'II', 'III', 'IV'))");
            DB::statement("ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_sex_check CHECK (sex IS NULL OR sex IN ('Male', 'Female'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('prosecutor_secretary_assignment_history');
        Schema::dropIfExists('prosecutor_secretary_assignments');
        Schema::dropIfExists('prosecutor_profiles');
        Schema::dropIfExists('staff_profiles');
    }
};
