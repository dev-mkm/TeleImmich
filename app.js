#!/usr/bin/env node
import { select } from "@inquirer/prompts";
import { backupHandler } from "./src/backupHandler.js";
import dotenv from "dotenv";
import { program } from "commander";
import { join } from "path";

dotenv.config({ path: join(import.meta.dirname, ".env") });
program
  .name("TeleImmich")
  .description("A Cli Telegram Backup Immich Syncer")
  .version("1.2.0");

program
  .command("upload")
  .description("Upload telegram backup to Immich")
  .argument("<file-path>", "The path to the telegram backup's result.json file")
  .action(async (str, options) => {
    var backup = new backupHandler(str);
    await backup.import();
  });

program.parse();
