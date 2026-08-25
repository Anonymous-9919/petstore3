CREATE TABLE "public"."SavedView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MediaAsset" (
    "id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedView_userId_resource_name_key" ON "public"."SavedView"("userId", "resource", "name");
CREATE INDEX "SavedView_userId_resource_updatedAt_idx" ON "public"."SavedView"("userId", "resource", "updatedAt");
CREATE UNIQUE INDEX "MediaAsset_path_key" ON "public"."MediaAsset"("path");
CREATE INDEX "MediaAsset_createdAt_idx" ON "public"."MediaAsset"("createdAt");

ALTER TABLE "public"."SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
