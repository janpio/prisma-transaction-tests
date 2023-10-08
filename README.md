# Prisma Transaction Tests

## Description

There are two tables, the snakes and the tails. There is a 1-1 relation between the tables and tail belongs to snake. We want to update the length of the snake (which is stored at both snake and tail tables) and at the same time retrieve a snake with its tail reliably (ie the tail should always have the same length with the snake).

For the length update operation we use prisma nested write ops and for the read we have different solutions:

1. Raw -> a query with relations is written as raw SQL
2. Nested -> a prisma with nested read queries
3. Nested-with-transaction -> a prisma with nested read queries wrapped in a transaction (RepeatableRead to make sure read ops are constistent).
4. Nested-with-interactive-transaction -> a prisma with nested read queries wrapped in an _interactive_ transaction (RepeatableRead to make sure read ops are constistent).
5. Indipendent -> different prisma queries wrapped in a transaction (RepeatableRead to make sure read ops are consistent).

## Run

```bash
nvm use # if you are using nvm, otherwise use your node version
docker compose up -d # to start the local database
npm i
cp .env.example .env # (no need to update DATABASE_URL if you are fine using the one from docker compose)
npx prisma db push
npm run test
# The test is running for 100 iterations for each mode and validates their results.
# Output
# Running for 100
# SUCCESS -> Finished without mismatches for mode 'raw'
# FAILURE -> Detected mismatch for mode 'nested'
# FAILURE -> Detected mismatch for mode 'nested-with-transaction'
# FAILURE -> Detected mismatch for mode 'nested-with-interactive-transaction'
# SUCCESS -> Finished without mismatches for mode 'independent'
# Done
```
