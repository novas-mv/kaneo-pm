ALTER TABLE "project" ADD COLUMN "parent_project_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_parent_project_id_project_id_fk" FOREIGN KEY ("parent_project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_parentProjectId_idx" ON "project" USING btree ("parent_project_id");