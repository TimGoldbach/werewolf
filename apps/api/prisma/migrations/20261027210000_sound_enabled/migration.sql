-- Live game setting: play the day/night soundscape in the console?
--
-- Presentation only, like `showNarration`: it does not change the game and is not part
-- of any statistic. Default true matches the behaviour before this column existed.
ALTER TABLE "Game" ADD COLUMN "soundEnabled" BOOLEAN NOT NULL DEFAULT true;
