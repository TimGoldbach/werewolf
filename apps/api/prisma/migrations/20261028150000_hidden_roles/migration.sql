-- Built-in roles the group has hidden from game setup and the rules page.
--
-- Roles come from the code catalog; a row here only marks one as unused by this group.
-- No row = visible, so an empty table shows the whole catalog, as before.
CREATE TABLE "HiddenRole" (
    "roleId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenRole_pkey" PRIMARY KEY ("roleId")
);
