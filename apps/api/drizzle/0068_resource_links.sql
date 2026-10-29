CREATE TABLE "resource_link" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"emoji" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_link" ADD CONSTRAINT "resource_link_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_link" ADD CONSTRAINT "resource_link_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "resource_link_workspace_project_position_idx" ON "resource_link" USING btree ("workspace_id","project_id","position");--> statement-breakpoint
CREATE INDEX "resource_link_project_id_idx" ON "resource_link" USING btree ("project_id");