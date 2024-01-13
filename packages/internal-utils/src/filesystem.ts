import fs from 'node:fs';
import path from 'node:path';

export function mkdirp(dir: string) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (error) {
		if ((error as any).code === 'EEXIST') {
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

export function rimraf(path: string) {
	(fs.rmSync || fs.rmdirSync)(path, { recursive: true, force: true });
}

interface WalkEntry {
	/**
	 * The `parent` excluding the walk `root` from the prefix
	 */
	baseDir: string;
	/**
	 * The `fullPath` excluding the walk `root` from the prefix
	 */
	basePath: string;
	/**
	 * The complete path of the current file or directory
	 */
	fullPath: string;
	/**
	 * The name of the current file or directory
	 */
	name: string;
	/**
	 * The fullpath of the parent of the current file or directory
	 */
	parent: string;
	/**
	 * The input walk directory
	 */
	root: string;
	/**
	 * Returns true if the `WalkEntry` object describes a file system directory
	 */
	isDirectory(): boolean;
	/**
	 * Returns true if the `WalkEntry` object describes a regular file
	 */
	isFile(): boolean;
}

function walkDir(
	root: string,
	parent: string,
	visitor: (file: WalkEntry) => void,
) {
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

export function walk(dir: string, visitor: (file: WalkEntry) => void) {
	if (fs.existsSync(dir)) {
		const resolved = path.resolve(dir);
		walkDir(resolved, resolved, visitor);
	}
}

export function write(file: string, contents: string) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}
