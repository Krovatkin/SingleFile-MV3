/*
 * Copyright 2010-2020 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of SingleFile.
 *
 *   The code in this file is free software: you can redistribute it and/or 
 *   modify it under the terms of the GNU Affero General Public License 
 *   (GNU AGPL) as published by the Free Software Foundation, either version 3
 *   of the License, or (at your option) any later version.
 * 
 *   The code in this file is distributed in the hope that it will be useful, 
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of 
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero 
 *   General Public License for more details.
 *
 *   As additional permission under GNU AGPL version 3 section 7, you may 
 *   distribute UNMODIFIED VERSIONS OF THIS file without the copy of the GNU 
 *   AGPL normally required by section 4, provided you include this license 
 *   notice and a URL through which recipients can access the Corresponding 
 *   Source.
 */

/* global fetch, FormData */



class pCloud {
	constructor(apiServer) {
		this.apiServer = apiServer || "api.pcloud.com";
	}

	setAuthInfo(authInfo) {
		if (authInfo) {
			this.accessToken = authInfo.accessToken;
			this.folder = authInfo.folder;
		} else {
			delete this.accessToken;
			delete this.folder;
		}
	}

	async upload(filename, blob, options, setCancelCallback) {
		const uploader = new MediaUploader({
			apiServer: this.apiServer,
			token: this.accessToken,
			folder: this.folder,
			file: blob,
			filename
		});
		if (setCancelCallback) {
			setCancelCallback(() => uploader.cancelled = true);
		}
		return await uploader.upload();
	}
}

class MediaUploader {
	constructor(options) {
		this.apiServer = options.apiServer;
		this.file = options.file;
		this.token = options.token;
		this.folder = options.folder;
		this.filename = options.filename;
	}

	async upload() {
		const formData = new FormData();
		// If folder is not provided, defaults to root (path=/). 
		// If provided, we need to resolve it primarily by path if it's a string path, 
		// or folderid if we had one. The user prompt suggests "folder to upload", usually a path.
		// pCloud API `uploadfile` accepts `path` or `folderid`.
		// Assuming `this.folder` contains the path string, e.g., "/my_backups"

		let path = this.folder;
		if (!path || path.trim() === "") {
			path = "/";
		}
		if (!path.startsWith("/")) {
			path = "/" + path;
		}

		formData.append("path", path);
		formData.append("filename", this.filename);
		formData.append("file", this.file, this.filename);

		// Implementation based on print_to_pdf_ext/background.js reference
		const encodedPath = encodeURIComponent(path);
		const url = `https://${this.apiServer}/uploadfile?auth=${this.token}&path=${encodedPath}`;

		const httpResponse = await fetch(url, {
			method: "POST",
			body: formData
		});

		const response = await getJSON(httpResponse);
		if (response.result === 0) {
			return response;
		} else {
			throw new Error("pcloud_error: " + response.error);
		}
	}
}

export { pCloud };

async function getJSON(httpResponse) {
	const response = await httpResponse.json();
	return response;
}
