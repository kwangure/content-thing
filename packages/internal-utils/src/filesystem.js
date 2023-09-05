import fs from 'node:fs';
import path from 'node:path';

/** @param {string} dir */
export function mkdirp(dir) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (error) {
		if (/** @type {any} */ (error).code === 'EEXIST') {
			if (!fs.statSync(dir).isDirectory()) {
				throw new Error(
					`Cannot create directory ${dir}, a file already exists at this position`,
				);
			}
			return;
		}
		throw error;
	}
}

/** @param {string} path */
export function rimraf(path) {
	(fs.rmSync || fs.rmdirSync)(path, { recursive: true, force: true });
}

/**
 * @typedef {Object} WalkEntry
 * @property {string} baseDir The `parent` excluding the walk `root` from the prefix
 * @property {string} basePath The `fullPath` excluding the walk `root` from the prefix
 * @property {string} fullPath The complete path of the current file or directory
 * @property {string} name The name of the current file or directory
 * @property {string} parent The fullpath of the parent of the current file or directory
 * @property {string} root The input walk directory
 * @property {() => boolean} isDirectory Returns true if the `WalkEntry` object describes a file system directory
 * @property {() => boolean} isFile Returns true if the `WalkEntry` object describes a regular file
 */

/**
 * @param {string} root
 * @param {string} parent
 * @param {((file: WalkEntry) => void)} visitor
 */
function walkDir(root, parent, visitor) {
	const dirs = fs.readdirSync(parent, {
		// 2X faster than `fs.readdirSync` followed by `fs.statSync`
		withFileTypes: true,
	});
	for (const entry of dirs) {
		const info = {
			get baseDir() {
				return parent.slice(root.length + 1);
			},
			get basePath() {
				return path.join(info.baseDir, entry.name);
			},
			get fullPath() {
				return path.join(parent, entry.name);
			},
			name: entry.name,
			parent,
			root,
			isDirectory: () => entry.isDirectory(),
			isFile: () => entry.isFile(),
		};
		visitor(info);
		if (entry.isDirectory()) {
			walkDir(root, path.join(parent, entry.name), visitor);
		}
	}
}

/**
 * @param {string} dir
 * @param {(file: WalkEntry) => void} visitor
 */
export function walk(dir, visitor) {
	if (fs.existsSync(dir)) {
		const resolved = path.resolve(dir);
		walkDir(resolved, resolved, visitor);
	}
}

/**
 * @param {string} file
 * @param {string} contents
 */
export function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}
