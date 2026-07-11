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

            $table->foreign(['case_id', 'revision_number'])
                ->references(['case_id', 'revision_number'])
                ->on('subpoena_revisions')
                ->restrictOnDelete();
            $table->foreign('decided_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['case_id', 'revision_number']);
            $table->index(['decided_by', 'decided_at']);
            $table->index(['case_id', 'decided_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE subpoena_decisions ADD CONSTRAINT subpoena_decisions_value_check CHECK (decision IN ('Approved', 'Denied'))");
            DB::statement("ALTER TABLE subpoena_decisions ADD CONSTRAINT subpoena_decisions_comment_check CHECK ((decision = 'Denied' AND comment_type = 'Subpoena' AND comment IS NOT NULL AND btrim(comment) <> '') OR (decision = 'Approved' AND comment_type IS NULL AND comment IS NULL))");
            DB::unprepared(<<<'SQL'
                CREATE OR REPLACE FUNCTION prevent_subpoena_decision_mutation()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'Subpoena decision history is append-only';
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER subpoena_decisions_append_only
                BEFORE UPDATE OR DELETE ON subpoena_decisions
                FOR EACH ROW EXECUTE FUNCTION prevent_subpoena_decision_mutation();

                CREATE TRIGGER subpoena_decisions_no_truncate
                BEFORE TRUNCATE ON subpoena_decisions
                FOR EACH STATEMENT EXECUTE FUNCTION prevent_subpoena_decision_mutation();
                SQL);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('subpoena_decisions') && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('LOCK TABLE subpoena_decisions IN ACCESS EXCLUSIVE MODE');
        }

        if (Schema::hasTable('subpoena_decisions') && DB::table('subpoena_decisions')->exists()) {
            throw new RuntimeException('Refusing to roll back subpoena decision history while records exist.');
        }

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS subpoena_decisions_append_only ON subpoena_decisions');
            DB::statement('DROP TRIGGER IF EXISTS subpoena_decisions_no_truncate ON subpoena_decisions');
            DB::statement('DROP FUNCTION IF EXISTS prevent_subpoena_decision_mutation()');
        }

        Schema::dropIfExists('subpoena_decisions');
    }
};
