-- CreateTable
CREATE TABLE "snakes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "length" INTEGER NOT NULL,

    CONSTRAINT "snakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tails" (
    "id" SERIAL NOT NULL,
    "length" INTEGER NOT NULL,
    "snake_id" INTEGER NOT NULL,

    CONSTRAINT "tails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "snakes_name_key" ON "snakes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tails_snake_id_key" ON "tails"("snake_id");

-- AddForeignKey
ALTER TABLE "tails" ADD CONSTRAINT "tails_snake_id_fkey" FOREIGN KEY ("snake_id") REFERENCES "snakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
