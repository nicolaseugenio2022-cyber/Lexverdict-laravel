<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'Audit history is append-only';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER audit_events_append_only
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

            CREATE TRIGGER audit_events_no_truncate
            BEFORE TRUNCATE ON audit_events
            FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_event_mutation();
            SQL);
    }

    public function down(): void
    {
        if (! Schema::hasTable('audit_events') || DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('LOCK TABLE audit_events IN ACCESS EXCLUSIVE MODE');
        if (DB::table('audit_events')->exists()) {
            throw new RuntimeException('Refusing to remove append-only protection while audit history exists.');
        }

        DB::statement('DROP TRIGGER IF EXISTS audit_events_no_truncate ON audit_events');
        DB::statement('DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events');
        DB::statement('DROP FUNCTION IF EXISTS prevent_audit_event_mutation()');
    }
};
