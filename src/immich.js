import axios from "axios";
import { readFileSync } from "fs";
import { basename } from "path";

export class immich {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.IMMICH_URL + "/api/",
      headers: {
        "x-api-key": process.env.IMMICH_API_KEY,
      },
    });
  }

  async request(method, endpoint, data = []) {
    var response;
    if (method == "POST") {
      response = await this.client.post(endpoint, data);
    } else if (method == "GET") {
      response = await this.client.get(endpoint);
    } else if (method == "PUT") {
      response = await this.client.put(endpoint, data);
    }

    return response.data;
  }

  async uploadMedia(
    file_path,
    device_asset_id,
    device_id,
    created_at,
    file_name = null,
    visibility = null,
  ) {
    const form = new FormData();
    const file = readFileSync(file_path);
    form.append(
      "assetData",
      new Blob([file], { type: "application/octet-stream" }),
      file_name ? file_name : basename(file_path),
    );
    form.append("deviceAssetId", device_asset_id);
    form.append("deviceId", device_id);
    form.append("filename", file_name ? file_name : basename(file_path));
    form.append("fileCreatedAt", created_at.toString());
    form.append("fileModifiedAt", created_at.toString());
    if (visibility) {
      form.append("visibility", visibility);
    }

    return await this.request("POST", "assets", form);
  }

  async updateMedia(ids, date) {
    return await this.request("PUT", "assets", {
      ids: ids,
      date: date.toString(),
    });
  }

  async checkBulkUpload(assets) {
    return await this.request("POST", "assets/bulk-upload-check", {
      assets: assets,
    });
  }

  async getAllAlbums() {
    return await this.request("GET", "albums");
  }

  async createAlbum(name, assets) {
    return await this.request("POST", "albums", {
      albumName: name,
      assetIds: assets,
    });
  }

  async addAssetsToAlbums(albums, assets) {
    return await this.request("POST", "albums/assets", {
      albumIds: albums,
      assetIds: assets,
    });
  }

  async getAsset(id) {
    return await this.request("GET", "assets/" + id);
  }
}
