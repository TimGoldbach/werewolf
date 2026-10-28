-- Live-Spiel-Einstellung: werden Rollen nach dem Tod aufgedeckt?
--
-- Bewusst NULLABLE ohne Default: für bereits erfasste Spiele ist die Einstellung
-- unbekannt. Ein Default `false` würde behaupten, sie seien mit verdeckten Rollen
-- gespielt worden — das wissen wir nicht, und die Statistik würde es als Fakt zählen.
ALTER TABLE "Game" ADD COLUMN "revealRolesOnDeath" BOOLEAN;
