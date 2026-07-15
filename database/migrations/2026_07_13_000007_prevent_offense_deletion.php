<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_offense_deletion()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Crime catalog records must be deactivated, not deleted.'
                    USING ERRCODE = '23514';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER offenses_prevent_delete
            BEFORE DELETE ON offenses
            FOR EACH ROW
            EXECUTE FUNCTION prevent_offense_deletion();

            CREATE TRIGGER offenses_prevent_truncate
            BEFORE TRUNCATE ON offenses
            FOR EACH STATEMENT
            EXECUTE FUNCTION prevent_offense_deletion();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS offenses_prevent_truncate ON offenses;
            DROP TRIGGER IF EXISTS offenses_prevent_delete ON offenses;
            DROP FUNCTION IF EXISTS prevent_offense_deletion();
        SQL);
    }
};
