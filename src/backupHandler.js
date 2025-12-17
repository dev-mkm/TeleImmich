import { createReadStream, readFileSync } from "fs";
import { MediaSync } from "../database/orm.js";
import { createHash } from "crypto";
import { immich } from "./immich.js";
import { confirm, input, select, Separator } from "@inquirer/prompts";
import yoctoSpinner from "yocto-spinner";
import { DateTime } from "luxon";
import chalk from "chalk";
import { basename, resolve } from "path";
import { exiftool } from "exiftool-vendored";
import open from "open";

export class backupHandler {
  constructor(path) {
    this.path = path;
    this.file_paths = [];
  }

  get data() {
    if (this._data) {
      return this._data;
    } else {
      this._data = JSON.parse(readFileSync(this.path));

      this.validate();

      return this._data;
    }
  }

  validate() {
    if (
      this._data.messages &&
      this._data.id &&
      this._data.name &&
      this._data.type
    ) {
      return true;
    } else {
      throw "Invalid File";
    }
  }

  async filter_media(message) {
    if (
      message.mime_type &&
      message.file !=
        "(File exceeds maximum size. Change data exporting settings to download.)"
    ) {
      if (this.file_paths.includes(message.file)) {
        return false;
      }
      if (
        message.media_type == "video_file" ||
        message.media_type == "video_message" ||
        message.mime_type == "image/png" ||
        message.mime_type == "image/jpeg" ||
        message.mime_type == "image/heic"
      ) {
        var media = await MediaSync.findOne({
          where: { chatId: this.data.id, messageId: message.id },
        });

        this.file_paths.push(message.file);
        if (media) {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async media_map(message) {
    message.path = this.path.slice(0, -11) + message.file;

    var hash = createHash("sha1");
    var fd = createReadStream(message.path);

    for await (const chunk of fd) {
      hash.update(chunk);
    }

    message.hash = hash.digest("hex");

    this.hash.push({
      id: message.id.toString(),
      checksum: message.hash,
    });

    return message;
  }

  async backupMedia() {
    const spinner = yoctoSpinner({ text: "Starting backup" }).start();
    this.hash = [];

    spinner.text = "Checking for duplicates";
    var filter = await Promise.all(
      this.data.messages.map((message) => this.filter_media(message))
    );
    spinner.text = "Hashing files";
    var media = await Promise.all(
      this.data.messages
        .filter((_, index) => filter[index])
        .map((message) => this.media_map(message))
    );

    spinner.text = "Checking for duplicates";
    const immichClient = new immich();
    var status = [];
    (await immichClient.checkBulkUpload(this.hash)).results.forEach(
      (element) => {
        status[element.id] = element;
      }
    );

    const max = media.length;
    var i = 0;
    var ids = [];
    for (const message of media) {
      i++;
      spinner.text = `Uploading ${i} / ${max}`;
      message.action = status[message.id.toString()].action;
      var date = DateTime.fromSeconds(parseInt(message.date_unixtime)).setZone(
        process.env.TZ
      );
      if (
        message.media_type == "video_file" ||
        message.media_type == "video_message"
      ) {
        const stat = await exiftool.read(message.path);
        if (
          stat.MediaCreateDate &&
          DateTime.fromJSDate(new Date(stat.MediaCreateDate)).isValid
        ) {
          spinner.stop();
          var datechoice = "";
          while (datechoice != "tg" && datechoice != "og") {
            console.log(resolve(message.path));
            datechoice = await select({
              message: `[${i}/${max}] Which date to use?`,
              default: "og",
              choices: [
                {
                  name:
                    "Telegram: " +
                    DateTime.fromSeconds(parseInt(message.date_unixtime))
                      .setZone(process.env.TZ)
                      .toFormat("yyyy-MM-dd hh:mm:ss"),
                  value: "tg",
                  description:
                    "The time this media was sent to you in telegram",
                  short: "Telegram",
                },
                {
                  name:
                    "Original: " +
                    DateTime.fromJSDate(new Date(stat.MediaCreateDate))
                      .setZone(process.env.TZ)
                      .toFormat("yyyy-MM-dd hh:mm:ss"),
                  value: "og",
                  description: "The original video create date",
                  short: "Original",
                },
                new Separator(),
                {
                  name: "View File",
                  value: "view",
                  description: "View the file",
                  short: "View",
                },
              ],
            });
            if (datechoice == "view") {
              await open(message.path);
            }
          }
          spinner.start();
          date =
            datechoice == "tg"
              ? DateTime.fromSeconds(parseInt(message.date_unixtime)).setZone(
                  process.env.TZ
                )
              : DateTime.fromJSDate(new Date(stat.MediaCreateDate)).setZone(
                  process.env.TZ
                );
        }
      }
      if (message.action != "accept") {
        if (status[message.id.toString()].assetId) {
          var getMedia;
          try {
            getMedia = await immichClient.getAsset(
              status[message.id.toString()].assetId
            );
          } catch (error) {
            await MediaSync.create({
              chatId: this.data.id,
              messageId: message.id,
              filePath: message.path,
              hash: message.hash,
              mediaId: status[message.id.toString()].assetId,
              existed: true,
            });
            continue;
          }
          const isOlder =
            DateTime.fromISO(getMedia.fileCreatedAt).toMillis() <=
            date.toMillis();
          const diff = [
            "\n  isTelegramOlder: ",
            chalk.white(!isOlder),
            "\n  immichDate: ",
            chalk.white(
              DateTime.fromISO(getMedia.fileCreatedAt)
                .setZone(process.env.TZ)
                .toFormat("yyyy-MM-dd hh:mm:ss")
            ),
            "\n  newDate: ",
            chalk.white(date.toFormat("yyyy-MM-dd hh:mm:ss")),
          ];
          if (!isOlder) {
            spinner.warning(
              chalk.bold.yellow(
                "Media was rejected for the following reason: "
              ) + chalk.reset.white(status[message.id.toString()].reason)
            );
            var info = Object.keys(status[message.id.toString()]).map(
              (key) =>
                `\n  ${key}: ` + chalk.white(status[message.id.toString()][key])
            );
            console.log(
              chalk.cyan(" Media Info:") +
                chalk.magentaBright(...info, ...diff, "\n")
            );
            var update = await confirm({
              message: `[${i}/${max}] Update media's date to telegram's date?`,
              default: true,
            });
            if (update) {
              try {
                await immichClient.updateMedia(
                  [status[message.id.toString()].assetId],
                  date
                );
                await MediaSync.create({
                  chatId: this.data.id,
                  messageId: message.id,
                  filePath: message.path,
                  hash: message.hash,
                  mediaId: status[message.id.toString()].assetId,
                  existed: true,
                  updated: true,
                });
              } catch (error) {
                console.log(error);
              }
            } else {
              await MediaSync.create({
                chatId: this.data.id,
                messageId: message.id,
                filePath: message.path,
                hash: message.hash,
                mediaId: status[message.id.toString()].assetId,
                existed: true,
              });
            }
            spinner.start(`Uploading ${i} / ${max}`);
          }
        } else {
          spinner.warning(message.action);
          console.log(status[message.id.toString()]);
          await input({
            message: `[${i}/${max}] ` + status[message.id.toString()].reason,
          });
          spinner.start(`Uploading ${i} / ${max}`);
        }
      } else {
        try {
          const uploaded = await immichClient.uploadMedia(
            message.path,
            message.id.toString(),
            "TeleImmich",
            date,
            message.file_name ?? basename(message.file)
          );
          ids.push(uploaded.id);
          await MediaSync.create({
            chatId: this.data.id,
            messageId: message.id,
            filePath: message.path,
            hash: message.hash,
            mediaId: uploaded.id,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
    spinner.success("Uploading Completed");
    if (ids.length > 0) {
      const albumName = await input({
        message:
          "Enter the name for the album (this will only create a new album if there is no album with the entered name)",
        required: true,
      });
      spinner.start("Looking for album with the same name");
      const albums = await immichClient.getAllAlbums();
      var albumId;
      for (const album in albums) {
        if (album.albumName == albumName && !albumId) {
          albumId = album.id;
        }
      }
      if (!albumId) {
        spinner.text = "Creating album with the media";
        await immichClient.createAlbum(albumName, ids);
      } else {
        spinner.text = "Adding media to album";
        await immichClient.addAssetsToAlbums([albumId], ids);
      }
    }
    spinner.success();
  }
}
