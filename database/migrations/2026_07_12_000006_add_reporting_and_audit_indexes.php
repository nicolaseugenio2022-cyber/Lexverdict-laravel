<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('case_offenses', function (Blueprint $table): void {
            $table->index(['offense_id', 'case_id'], 'case_offenses_report_filter_index');
        });
        Schema::table('case_parties', function (Blueprint $table): void {
            $table->index(['sex', 'case_id'], 'case_parties_sex_report_index');
            $table->index(['date_of_birth', 'case_id'], 'case_parties_age_report_index');
        });
        Schema::table('audit_events', function (Blueprint $table): void {
            $table->index(['event_type', 'occurred_at'], 'audit_events_action_time_index');
            $table->index('occurred_at', 'audit_events_occurred_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('audit_events', function (Blueprint $table): void {
            $table->dropIndex('audit_events_occurred_at_index');
            $table->dropIndex('audit_events_action_time_index');
        });
        Schema::table('case_parties', function (Blueprint $table): void {
            $table->dropIndex('case_parties_age_report_index');
            $table->dropIndex('case_parties_sex_report_index');
        });
        Schema::table('case_offenses', function (Blueprint $table): void {
            $table->dropIndex('case_offenses_report_filter_index');
        });
    }
};
