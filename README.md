Here’s a clean, ready-to-use **README.md** for your CLI tool based on the commands and `package.json` you shared. You can copy-paste this directly into your repo.

---

# TeleImmich

**TeleImmich** is a CLI tool that syncs exported **Telegram backups** to an **Immich** instance, preserving media metadata and dates with flexible configuration options.

It is designed to work with Telegram’s `result.json` export format and upload media directly into Immich albums.

---

## Features

* 📦 Upload Telegram backup media to Immich
* 🖼️ Optional album assignment
* 🕒 Flexible date handling for videos and media
* 🔄 Update metadata for existing media
* 🧪 Test Immich connection
* ⚙️ Persistent configuration
* 🧪 Dry-run mode (no changes made)

---

## Installation

### Using npm (global install)

```bash
npm install -g tele-immich
```

After installation, the CLI will be available as:

```bash
TeleImmich
```

---

## Basic Usage

```bash
TeleImmich <command> [options]
```

---

## Commands

### `upload`

Upload a Telegram backup to Immich.

```bash
TeleImmich upload <file-path> [options]
```

#### Arguments

* `<file-path>`
  Path to the Telegram backup’s `result.json` file

#### Options

| Option                      | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `-a, --album <name>`        | Upload media into a specific Immich album           |
| `--vo, --vid-original-date` | Always use the video’s original creation date       |
| `--vt, --vid-telegram-date` | Always use Telegram’s sent date for videos          |
| `-u, --update-date`         | Update existing media dates if backup date is older |
| `-n, --no-update-date`      | Do not update existing media dates                  |
| `-d, --dry-run`             | Simulate upload without making changes              |

#### Example

```bash
TeleImmich upload ./telegram-export/result.json \
  --album "Telegram Backup" \
  --vid-original-date
```

---

### `config`

Configure the connection to your Immich instance.

```bash
TeleImmich config [options]
```

#### Options

| Option                  | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `-u, --url <url>`       | Immich instance URL (no trailing slash)                   |
| `-a, --api-key <key>`   | Immich API key                                            |
| `-t, --timezone <name>` | Timezone for uploaded media (e.g. `UTC`, `Europe/Berlin`) |

#### Example

```bash
TeleImmich config \
  --url https://immich.example.com \
  --api-key YOUR_API_KEY \
  --timezone UTC
```

Configuration is stored locally and reused for future commands.

---

### `test`

Test the connection to the configured Immich instance.

```bash
TeleImmich test
```

This verifies:

* API key validity
* Instance reachability

---

## Workflow Example

1. Export your Telegram data (include media)
2. Configure Immich connection:

   ```bash
   TeleImmich config
   ```
3. Test the connection:

   ```bash
   TeleImmich test
   ```
4. Upload your backup:

   ```bash
   TeleImmich upload ./result.json --album "Telegram"
   ```

---

## Notes & Behavior

* Existing media is detected to avoid duplicates
* Date handling options determine how timestamps are assigned
* `--dry-run` is highly recommended for first-time usage
* Albums are created automatically if they don’t exist
