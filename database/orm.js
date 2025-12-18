import { Sequelize, DataTypes } from "sequelize";
import { readFileSync } from "fs";
import { join } from "path";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: join(import.meta.dirname, "database.sqlite"),
  dialectOptions: {
    multipleStatements: true,
  },
  logging: false,
});

try {
  await sequelize.authenticate();
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

const tables = await sequelize.showAllSchemas();

if (tables.length == 0) {
  await initDB();
}

export const MediaSync = sequelize.define(
  "MediaSync",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    backupType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Immich",
    },
    mediaId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    existed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    updated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {},
);

async function initDB() {
  await Promise.all(
    readFileSync(join(import.meta.dirname, "migration.sql"), "utf8")
      .split(";")
      .map((query) => sequelize.query(query)),
  );
}
