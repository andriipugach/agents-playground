-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- Backfill existing global favorites to a deterministic legacy device.
INSERT INTO "Device" ("id")
VALUES ('00000000-0000-4000-8000-000000000000');

-- AlterTable
ALTER TABLE "FavoriteCity"
ADD COLUMN "deviceId" TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000000';

ALTER TABLE "FavoriteCity"
ALTER COLUMN "deviceId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "LoadedCity" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadedCity_pkey" PRIMARY KEY ("id")
);

-- DropIndex
DROP INDEX "FavoriteCity_city_key";

-- CreateIndex
CREATE INDEX "FavoriteCity_deviceId_idx" ON "FavoriteCity"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCity_deviceId_city_key" ON "FavoriteCity"("deviceId", "city");

-- CreateIndex
CREATE INDEX "LoadedCity_deviceId_createdAt_idx" ON "LoadedCity"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "FavoriteCity" ADD CONSTRAINT "FavoriteCity_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadedCity" ADD CONSTRAINT "LoadedCity_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
