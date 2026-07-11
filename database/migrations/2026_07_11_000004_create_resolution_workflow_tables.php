<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resolutions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('case_id')->unique();
            $table->string('verdict', 32);
            $table->string('court')->nullable();
            $table->date('verdict_date');
            $table->string('status', 32)->default('Pending');
            $table->unsignedInteger('revision_number')->default(1);
            $table->uuid('current_revision_id')->nullable()->unique();
            $table->uuid('current_decision_id')->nullable()->unique();
            $table->uuid('created_by_user_id');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['status', 'verdict', 'verdict_date']);
            $table->index(['created_by_user_id', 'status']);
        });

        Schema::create('resolution_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resolution_id');
            $table->unsignedInteger('revision_number');
            $table->string('verdict', 32);
            $table->string('court')->nullable();
            $table->date('verdict_date');
            $table->uuid('submitted_by');
            $table->timestampTz('submitted_at');
            $table->timestamps();

            $table->foreign('resolution_id')->references('id')->on('resolutions')->restrictOnDelete();
            $table->foreign('submitted_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['resolution_id', 'revision_number']);
            $table->unique(['resolution_id', 'id']);
        });

        Schema::create('resolution_decisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('resolution_id');
            $table->unsignedInteger('revision_number');
            $table->string('decision', 32);
            $table->string('comment_type', 32)->nullable();
            $table->text('comment')->nullable();
            $table->uuid('decided_by');
            $table->timestampTz('decided_at');
            $table->timestamps();

            $table->foreign(['resolution_id', 'revision_number'])
                ->references(['resolution_id', 'revision_number'])
                ->on('resolution_revisions')
                ->restrictOnDelete();
            $table->foreign('decided_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['resolution_id', 'revision_number']);
            $table->unique(['resolution_id', 'id']);
            $table->index(['decided_by', 'decided_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE resolutions ADD CONSTRAINT resolutions_verdict_check CHECK (verdict IN ('For Filing', 'Dismissed', 'Pending'))");
            DB::statement("ALTER TABLE resolutions ADD CONSTRAINT resolutions_status_check CHECK (status IN ('Pending', 'Approved', 'Denied'))");
            DB::statement("ALTER TABLE resolutions ADD CONSTRAINT resolutions_court_check CHECK ((verdict = 'For Filing' AND court IS NOT NULL AND btrim(court) <> '') OR (verdict IN ('Dismissed', 'Pending') AND court IS NULL))");
            DB::statement("ALTER TABLE resolution_revisions ADD CONSTRAINT resolution_revisions_verdict_check CHECK (verdict IN ('For Filing', 'Dismissed'))");
            DB::statement("ALTER TABLE resolution_revisions ADD CONSTRAINT resolution_revisions_court_check CHECK ((verdict = 'For Filing' AND court IS NOT NULL AND btrim(court) <> '') OR (verdict = 'Dismissed' AND court IS NULL))");
            DB::statement("ALTER TABLE resolution_decisions ADD CONSTRAINT resolution_decisions_value_check CHECK (decision IN ('Approved', 'Denied'))");
            DB::statement("ALTER TABLE resolution_decisions ADD CONSTRAINT resolution_decisions_comment_check CHECK ((decision = 'Denied' AND comment_type = 'Resolution' AND comment IS NOT NULL AND btrim(comment) <> '') OR (decision = 'Approved' AND comment_type IS NULL AND comment IS NULL))");
            DB::statement('ALTER TABLE resolutions ADD CONSTRAINT resolutions_current_revision_fk FOREIGN KEY (id, current_revision_id) REFERENCES resolution_revisions (resolution_id, id) DEFERRABLE INITIALLY DEFERRED');
            DB::statement('ALTER TABLE resolutions ADD CONSTRAINT resolutions_current_decision_fk FOREIGN KEY (id, current_decision_id) REFERENCES resolution_decisions (resolution_id, id) DEFERRABLE INITIALLY DEFERRED');
            DB::unprepared(<<<'SQL'
                CREATE OR REPLACE FUNCTION prevent_resolution_history_mutation()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'Resolution history is append-only';
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER resolution_revisions_append_only
                BEFORE UPDATE OR DELETE ON resolution_revisions
                FOR EACH ROW EXECUTE FUNCTION prevent_resolution_history_mutation();

                CREATE TRIGGER resolution_revisions_no_truncate
                BEFORE TRUNCATE ON resolution_revisions
                FOR EACH STATEMENT EXECUTE FUNCTION prevent_resolution_history_mutation();

                CREATE TRIGGER resolution_decisions_append_only
                BEFORE UPDATE OR DELETE ON resolution_decisions
                FOR EACH ROW EXECUTE FUNCTION prevent_resolution_history_mutation();

                CREATE TRIGGER resolution_decisions_no_truncate
                BEFORE TRUNCATE ON resolution_decisions
                FOR EACH STATEMENT EXECUTE FUNCTION prevent_resolution_history_mutation();

                CREATE OR REPLACE FUNCTION enforce_resolution_head_integrity()
                RETURNS trigger AS $$
                DECLARE
                    head resolutions%ROWTYPE;
                    revision resolution_revisions%ROWTYPE;
                    decision resolution_decisions%ROWTYPE;
                    target_id uuid;
                BEGIN
                    IF TG_TABLE_NAME = 'resolutions' THEN
                        target_id := NEW.id;
                    ELSE
                        target_id := NEW.resolution_id;
                    END IF;
                    SELECT * INTO head FROM resolutions WHERE id = target_id;
                    IF NOT FOUND THEN
                        RETURN NULL;
                    END IF;

                    IF head.current_revision_id IS NULL THEN
                        RAISE EXCEPTION 'Resolution head must reference its current revision';
                    END IF;

                    SELECT * INTO revision FROM resolution_revisions
                    WHERE id = head.current_revision_id AND resolution_id = head.id;
                    IF NOT FOUND
                        OR revision.revision_number <> head.revision_number
                        OR revision.verdict <> head.verdict
                        OR revision.court IS DISTINCT FROM head.court THEN
                        RAISE EXCEPTION 'Resolution head does not match its current revision';
                    END IF;

                    IF head.status = 'Pending' THEN
                        IF head.current_decision_id IS NOT NULL THEN
                            RAISE EXCEPTION 'Pending Resolution cannot reference a decision';
                        END IF;
                        IF EXISTS (
                            SELECT 1 FROM resolution_decisions
                            WHERE resolution_id = head.id
                              AND revision_number = head.revision_number
                        ) THEN
                            RAISE EXCEPTION 'Pending Resolution revision cannot have a decision';
                        END IF;
                    ELSE
                        IF head.current_decision_id IS NULL THEN
                            RAISE EXCEPTION 'Reviewed Resolution must reference its current decision';
                        END IF;

                        SELECT * INTO decision FROM resolution_decisions
                        WHERE id = head.current_decision_id
                          AND resolution_id = head.id
                          AND revision_number = head.revision_number;
                        IF NOT FOUND OR decision.decision <> head.status THEN
                            RAISE EXCEPTION 'Resolution head does not match its current decision';
                        END IF;
                    END IF;

                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;

                CREATE CONSTRAINT TRIGGER resolutions_head_integrity
                AFTER INSERT OR UPDATE ON resolutions
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION enforce_resolution_head_integrity();

                CREATE CONSTRAINT TRIGGER resolution_revisions_head_integrity
                AFTER INSERT ON resolution_revisions
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION enforce_resolution_head_integrity();

                CREATE CONSTRAINT TRIGGER resolution_decisions_head_integrity
                AFTER INSERT ON resolution_decisions
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION enforce_resolution_head_integrity();

                SQL);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('resolutions') && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('LOCK TABLE resolutions, resolution_revisions, resolution_decisions IN ACCESS EXCLUSIVE MODE');
        }

        if ((Schema::hasTable('resolution_decisions') && DB::table('resolution_decisions')->exists())
            || (Schema::hasTable('resolution_revisions') && DB::table('resolution_revisions')->exists())
            || (Schema::hasTable('resolutions') && DB::table('resolutions')->exists())) {
            throw new RuntimeException('Refusing to roll back Resolution history while records exist.');
        }

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS resolution_decisions_head_integrity ON resolution_decisions');
            DB::statement('DROP TRIGGER IF EXISTS resolution_revisions_head_integrity ON resolution_revisions');
            DB::statement('DROP TRIGGER IF EXISTS resolutions_head_integrity ON resolutions');
            DB::statement('DROP FUNCTION IF EXISTS enforce_resolution_head_integrity()');
            DB::statement('ALTER TABLE resolutions DROP CONSTRAINT IF EXISTS resolutions_current_decision_fk');
            DB::statement('ALTER TABLE resolutions DROP CONSTRAINT IF EXISTS resolutions_current_revision_fk');
            DB::statement('DROP TRIGGER IF EXISTS resolution_decisions_no_truncate ON resolution_decisions');
            DB::statement('DROP TRIGGER IF EXISTS resolution_decisions_append_only ON resolution_decisions');
            DB::statement('DROP TRIGGER IF EXISTS resolution_revisions_no_truncate ON resolution_revisions');
            DB::statement('DROP TRIGGER IF EXISTS resolution_revisions_append_only ON resolution_revisions');
            DB::statement('DROP FUNCTION IF EXISTS prevent_resolution_history_mutation()');
        }

        Schema::dropIfExists('resolution_decisions');
        Schema::dropIfExists('resolution_revisions');
        Schema::dropIfExists('resolutions');
    }
};
