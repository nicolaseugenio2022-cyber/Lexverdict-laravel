<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table): void {
            $table->text('pin_document_secret')->nullable();
        });

        Schema::create('generated_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('case_id');
            $table->string('document_type', 32);
            $table->string('template_version', 32);
            $table->unsignedInteger('version');
            $table->text('render_payload');
            $table->string('disk', 32)->nullable();
            $table->string('storage_path')->nullable();
            $table->char('sha256', 64)->nullable();
            $table->unsignedBigInteger('byte_size')->nullable();
            $table->uuid('requested_by');
            $table->timestampTz('requested_at');
            $table->timestampTz('generated_at')->nullable();
            $table->timestampTz('failed_at')->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('cases')->restrictOnDelete();
            $table->foreign('requested_by')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['case_id', 'document_type', 'version']);
            $table->index(['case_id', 'document_type', 'generated_at']);
            $table->index(['requested_by', 'requested_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_type_check CHECK (document_type = 'Subpoena')");
            DB::statement("ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_template_check CHECK (template_version = 'legacy-v1')");
            DB::statement('ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_version_check CHECK (version > 0)');
            DB::statement("ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_payload_check CHECK (btrim(render_payload) <> '')");
            DB::statement("ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_ready_check CHECK ((generated_at IS NULL AND failed_at IS NULL AND disk IS NULL AND storage_path IS NULL AND sha256 IS NULL AND byte_size IS NULL) OR (generated_at IS NOT NULL AND failed_at IS NULL AND disk = 'local' AND storage_path = 'documents/subpoenas/' || case_id::text || '/v' || version::text || '.pdf' AND sha256 ~ '^[0-9a-f]{64}$' AND byte_size > 0) OR (generated_at IS NULL AND failed_at IS NOT NULL AND disk IS NULL AND storage_path IS NULL AND sha256 IS NULL AND byte_size IS NULL))");
            DB::unprepared(<<<'SQL'
                CREATE OR REPLACE FUNCTION protect_generated_document_history()
                RETURNS trigger AS $$
                BEGIN
                    IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
                        RAISE EXCEPTION 'Generated document history cannot be removed';
                    END IF;

                    IF OLD.generated_at IS NOT NULL OR OLD.failed_at IS NOT NULL THEN
                        RAISE EXCEPTION 'Generated document metadata is immutable';
                    END IF;

                    IF NEW.id <> OLD.id
                        OR NEW.case_id <> OLD.case_id
                        OR NEW.document_type <> OLD.document_type
                        OR NEW.template_version <> OLD.template_version
                        OR NEW.version <> OLD.version
                        OR NEW.render_payload <> OLD.render_payload
                        OR NEW.requested_by <> OLD.requested_by
                        OR NEW.requested_at <> OLD.requested_at THEN
                        RAISE EXCEPTION 'Generated document identity is immutable';
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER generated_documents_protect_update_delete
                BEFORE UPDATE OR DELETE ON generated_documents
                FOR EACH ROW EXECUTE FUNCTION protect_generated_document_history();

                CREATE TRIGGER generated_documents_no_truncate
                BEFORE TRUNCATE ON generated_documents
                FOR EACH STATEMENT EXECUTE FUNCTION protect_generated_document_history();
                SQL);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('generated_documents') && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('LOCK TABLE cases, generated_documents IN ACCESS EXCLUSIVE MODE');
        }

        if ((Schema::hasTable('generated_documents') && DB::table('generated_documents')->exists())
            || (Schema::hasColumn('cases', 'pin_document_secret') && DB::table('cases')->whereNotNull('pin_document_secret')->exists())) {
            throw new RuntimeException('Refusing to roll back generated Subpoena document history or secrets.');
        }

        if (Schema::hasTable('generated_documents') && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS generated_documents_no_truncate ON generated_documents');
            DB::statement('DROP TRIGGER IF EXISTS generated_documents_protect_update_delete ON generated_documents');
            DB::statement('DROP FUNCTION IF EXISTS protect_generated_document_history()');
        }

        Schema::dropIfExists('generated_documents');
        Schema::table('cases', function (Blueprint $table): void {
            $table->dropColumn('pin_document_secret');
        });
    }
};
