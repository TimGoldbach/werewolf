-- Feedback nach der Partie: Wie fand die Runde das Set (die Rollen-Kombination)?
-- 1 (Flop) bis 5 (Top); gewichtet die Set-Vorschläge beim Anlegen eines Spiels.
--
-- Bewusst NULLABLE ohne Default: „nicht bewertet" ist keine Note. Bisherige Spiele haben
-- kein Feedback und zählen in den Vorschlägen neutral — nur als gespielt.
ALTER TABLE "Game" ADD COLUMN "setRating" INTEGER;
