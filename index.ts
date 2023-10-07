import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function init() {
  await prisma.snake.deleteMany({});
  await prisma.snake.create({
    data: {
      name: "Python",
      length: 10,
      tail: {
        create: {
          length: 10,
        },
      },
    },
  });
}

async function write(length: number) {
  await prisma.snake.update({
    where: { name: "Python" },
    data: {
      length,
      tail: {
        update: {
          length,
        },
      },
    },
  });
}

type ReadMode = "raw" | "nested" | "nested-with-transaction" | "independent";

async function read(mode: ReadMode) {
  let snakeWithTail: {
    tail: {
      id: number;
      length: number;
      snakeId: number;
    } | null;
  } & {
    id: number;
    name: string;
    length: number;
  };
  switch (mode) {
    case "raw":
      const rawSnakes: any =
        await prisma.$queryRaw`SELECT s.*, t.id as tail_id, t.length as tail_length, t.snake_id FROM snakes s JOIN tails t ON s.id = t.snake_id WHERE s.name = 'Python'`;
      const rawSnake = rawSnakes[0];
      snakeWithTail = {
        id: rawSnake.id,
        name: rawSnake.name,
        length: rawSnake.length,
        tail: {
          id: rawSnake.tail_id,
          length: rawSnake.tail_length,
          snakeId: rawSnake.snake_id,
        },
      };
      break;
    case "independent":
      const [snake, tail] = await prisma.$transaction(
        [
          prisma.snake.findUniqueOrThrow({
            where: { name: "Python" },
          }),
          prisma.tail.findFirst({
            where: { snake: { name: "Python" } },
          }),
        ],
        {
          isolationLevel: "RepeatableRead",
        }
      );
      snakeWithTail = {
        ...snake,
        tail,
      };
      break;
    case "nested-with-transaction":
      [snakeWithTail] = await prisma.$transaction(
        [
          prisma.snake.findUniqueOrThrow({
            where: { name: "Python" },
            include: { tail: true },
          }),
        ],
        {
          isolationLevel: "RepeatableRead",
        }
      );
      break;
    case "nested":
    default:
      snakeWithTail = await prisma.snake.findUniqueOrThrow({
        where: { name: "Python" },
        include: { tail: true },
      });
  }
  if (snakeWithTail.length !== snakeWithTail.tail?.length) {
    throw snakeWithTail;
  }
}

async function writeLoop(runFor: number) {
  for (let i = 0; i < runFor; i++) {
    await write(i);
  }
}

async function readLoop(runFor: number, mode: any) {
  for (let i = 0; i < runFor; i++) {
    await read(mode);
  }
}

async function test(runFor: number, mode: any) {
  await init();
  try {
    await Promise.all([writeLoop(runFor), readLoop(runFor, mode)]);
  } catch {
    console.log(
      `FAILURE -> Detected mismatch for mode '${mode}' with error data`
    );
    return;
  }
  console.log(`SUCCESS -> Finished without mismatches for mode '${mode}'`);
}

async function main() {
  const runFor = process.env.RUN_FOR ? parseInt(process.env.RUN_FOR) : 100;
  console.log("Running for", runFor);
  await test(runFor, "raw");
  await test(runFor, "nested");
  await test(runFor, "nested-with-transaction");
  await test(runFor, "independent");
  console.log("Done");
}

main();
