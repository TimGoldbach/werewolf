-- Sitzordnung entfernt + Rollen-Zuweisung beim Live-Spiel aufgeschoben.

-- DropIndex (Sitzplatz-Eindeutigkeit entfällt)
DROP INDEX "GamePlayer_gameId_seatIndex_key";

-- AlterTable: Sitzindex entfernen, Rolle optional (wird live beim Aufwachen gesetzt)
ALTER TABLE "GamePlayer" DROP COLUMN "seatIndex";
ALTER TABLE "GamePlayer" ALTER COLUMN "roleId" DROP NOT NULL;
