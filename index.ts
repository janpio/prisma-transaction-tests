import { PrismaClient } from "@prisma/client";
const writePrisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})
writePrisma.$on('query', (e) => {
  console.log('writePrisma: ' + e.query)
})

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})
prisma.$on('query', (e) => {
  console.log('readPrisma: ' + e.query)
})

async function init() {
  await writePrisma.snake.deleteMany({});
  await writePrisma.snake.create({
    data: {
      name: "Python",
      length: 999,
      tail: {
        create: {
          length: 999,
        },
      },
    },
  });
  console.log("# create", 999, 999)
}

async function write(mode: ReadMode, length: number) {
  await writePrisma.snake.update({
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
  console.log(`# write (${length}, ${mode})`, length, length)
}

type ReadMode =
  | "raw"
  | "nested"
  | "nested-with-transaction"
  | "nested-with-interactive-transaction"
  | "independent";

async function read(mode: ReadMode, i: number) {
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
    case "nested":
      snakeWithTail = await prisma.snake.findUniqueOrThrow({
        where: { name: "Python" },
        include: { tail: true },
      });
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
    case "nested-with-interactive-transaction":
      snakeWithTail = await prisma.$transaction(async (tx) => {
        return tx.snake.findUniqueOrThrow({
          where: { name: "Python" },
          include: { tail: true },
        });
      },
        {
          isolationLevel: "RepeatableRead",
        }
      );
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
    default:
      throw new Error("undefined mode")

  }
  console.log(`# read (${i}, ${mode})`, snakeWithTail.length, snakeWithTail.tail?.length)
  if (snakeWithTail.length !== snakeWithTail.tail?.length) {
    throw snakeWithTail;
  }
}

async function writeLoop(runFor: number, mode: any) {
  for (let i = 0; i < runFor; i++) {
    await write(mode, i);
  }
}

async function readLoop(runFor: number, mode: any) {
  for (let i = 0; i < runFor; i++) {
    await read(mode, i);
  }
}

async function test(runFor: number, mode: any) {
  console.log("\n%%% test", mode)
  console.log("\n% init")
  await init();
  console.log("\n% promises")

  await Promise.allSettled([writeLoop(runFor, mode), readLoop(runFor, mode)])
    .then(results => {
      for (const result of results) {
        if (result.status === 'rejected') {
          console.log(`FAILURE -> Detected mismatch for mode '${mode}'`);
          console.log("results: ", result.reason.length, result.reason.tail?.length)
          return;
        }
      }
      console.log(`SUCCESS -> Finished without mismatches for mode '${mode}'`);
    })
}

async function main() {
  const runFor = process.env.RUN_FOR ? parseInt(process.env.RUN_FOR) : 100;
  console.log("Running for", runFor);
  await test(runFor, "raw");
  await sleep(2000)
  console.log("% continue")
  await test(runFor, "nested");
  await sleep(2000)
  console.log("% continue")
  await test(runFor, "nested-with-transaction");
  await sleep(2000)
  console.log("% continue")
  await test(runFor, "nested-with-interactive-transaction");
  await sleep(2000)
  console.log("% continue")
  await test(runFor, "independent");
  console.log("Done");
}

function sleep(ms: number) {
  console.log("% sleep, to wait for logs", ms)
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
