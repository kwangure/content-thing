import fs from 'node:fs';
import path from 'node:path';

export function mkdirp(dir: string) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (e) {
		if ((e as { code: string }).code === 'EEXIST') return;
		throw e;
	}
}

export function rimraf(path: string) {
	(fs.rmSync || fs.rmdirSync)(path, { recursive: true, force: true });
}

function walkDir(parent: string, visitor: (file: fs.Dirent) => void) {
	const dirs = fs.readdirSync(parent, { withFileTypes: true });
	for (const entry of dirs) {
		visitor(entry);
		if (entry.isDirectory()) {
			walkDir(path.join(parent, entry.name), visitor);
		}
	}
}

export function walk(dir: string, visitor: (file: fs.Dirent) => void) {
	if (fs.existsSync(dir)) {
		walkDir(path.resolve(dir), visitor);
	}
}

export function write(file: string, contents: string) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}
