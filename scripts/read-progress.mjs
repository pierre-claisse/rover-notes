import { main } from "../src/read/cli.ts";

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Lecture impossible.");
  process.exitCode = 1;
}
