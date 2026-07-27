<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offenses', function (Blueprint $table): void {
            $table->string('canonical_key', 160)->nullable()->unique();
            $table->text('source_url')->nullable();
            $table->text('source_note')->nullable();
        });

        DB::table('offenses')->where('is_active', false)->update(['is_active' => true]);

        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS offenses_prevent_truncate ON offenses;
            DROP TRIGGER IF EXISTS offenses_prevent_delete ON offenses;
            DROP FUNCTION IF EXISTS prevent_offense_deletion();

            CREATE OR REPLACE FUNCTION prevent_offense_truncation()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Crime catalog truncation is prohibited.'
                    USING ERRCODE = '23514';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER offenses_prevent_truncate
            BEFORE TRUNCATE ON offenses
            FOR EACH STATEMENT
            EXECUTE FUNCTION prevent_offense_truncation();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS offenses_prevent_truncate ON offenses;
            DROP FUNCTION IF EXISTS prevent_offense_truncation();

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

        Schema::table('offenses', function (Blueprint $table): void {
            $table->dropUnique(['canonical_key']);
            $table->dropColumn(['canonical_key', 'source_url', 'source_note']);
        });
    }
};
