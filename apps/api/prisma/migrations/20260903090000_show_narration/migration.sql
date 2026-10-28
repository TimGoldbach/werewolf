-- Live-Spiel-Einstellung: sollen die Erzähltexte zum Vorlesen angezeigt werden?
--
-- Anders als `revealRolesOnDeath` ist das KEINE Hausregel, sondern reine Darstellung:
-- Sie verändert das Spiel nicht und taucht in keiner Statistik auf. Deshalb hier ein
-- Default statt NULL — „unbekannt" gibt es nicht zu wissen, und der Default entspricht
-- dem bisherigen Verhalten (Texte werden angezeigt).
ALTER TABLE "Game" ADD COLUMN "showNarration" BOOLEAN NOT NULL DEFAULT true;
