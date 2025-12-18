#!/usr/bin/env node
import { input } from "@inquirer/prompts";
import { backupHandler } from "./src/backupHandler.js";
import dotenv from "dotenv";
import { program } from "commander";
import { join } from "path";
import { existsSync, writeFileSync } from "fs";
import { immich } from "./src/immich.js";
import chalk from "chalk";
import { exit } from "process";

if (!existsSync(join(import.meta.dirname, ".env"))) {
  process.env.IMMICH_URL = await input({
    message: "Immich instance url (no trailing slashes):",
    required: true,
    validate: (str) => /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-]*)*$/.test(str),
  });
  process.env.IMMICH_API_KEY = await input({
    message: "Immich api key:",
    required: true,
  });
  try {
    const immichClient = new immich();
    await immichClient.getAllAlbums();
  } catch (error) {
    console.log(error);
    console.log(chalk.red("Failed to connect to immich instance!"));
    exit();
  }
  process.env.TZ = await input({
    message: "Timezone:",
    required: true,
    default: "UTC",
    validate: (str) => Intl.supportedValuesOf("timeZone").includes(str),
  });
  writeFileSync(
    join(import.meta.dirname, ".env"),
    `IMMICH_URL=${process.env.IMMICH_URL}\nIMMICH_API_KEY=${process.env.IMMICH_API_KEY}\nTZ=${process.env.TZ}`,
  );
} else {
  dotenv.config({ path: join(import.meta.dirname, ".env"), quiet: true });
}
program
  .name("TeleImmich")
  .description("A Cli Telegram Backup Immich Syncer")
  .version("1.2.0");

program
  .command("upload")
  .description("Upload telegram backup to Immich")
  .argument("<file-path>", "The path to the telegram backup's result.json file")
  .option("-a, --album <name>", "The album to upload media to")
  .option("--vo, --vid-original-date", "Always choose video's original date")
  .option(
    "--vt, --vid-telegram-date",
    "Always choose video's telegram sent date",
  )
  .option("-u, --update-date", "Update existing media's date to backup's date if it's older")
  .option("-n, --no-update-date", "Don't update existing media's date even if backup's date is older")
  .option("-d, --dry-run", "Don't make any changes to the immich instance")
  .action(async (path, options) => {
    var backup = new backupHandler(path);
    await backup.backupMedia(options);
    process.exit(0);
  });

program.parse();
