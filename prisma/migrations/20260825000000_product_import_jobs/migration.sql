CREATE TABLE "public"."ProductImportJob" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEWED',
    "sourceCsv" TEXT NOT NULL,
    "mapping" JSONB,
    "summary" JSONB NOT NULL,
    "errors" JSONB,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ProductImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImportJob_actorId_createdAt_idx" ON "public"."ProductImportJob"("actorId", "createdAt");
CREATE INDEX "ProductImportJob_status_createdAt_idx" ON "public"."ProductImportJob"("status", "createdAt");
ALTER TABLE "public"."ProductImportJob" ADD CONSTRAINT "ProductImportJob_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
