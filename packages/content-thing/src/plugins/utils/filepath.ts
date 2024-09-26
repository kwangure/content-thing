import { cwd } from 'node:process';
import path from 'node:path';

const posixify = (string: string) => string.replace(/\\/g, '/');

export function parseFilepath(filepath: string) {
	// Posixify filepath to ensure consistent ids cross-platform
	const matcher = new RegExp(
		`${posixify(cwd())}/src/collections/([^/]+)/(.+)/([^/]+)$`,
	);
	const match = matcher.exec(posixify(filepath));
	if (!match) {
		throw Error(`Filepath '${filepath}' is not a valid collection entry.`);
	}
	const [, collection, id, basename] = match;
	return {
		collection: {
			name: collection,
			filepath: path.join(cwd(), '/src/collections/', collection),
		},
		entry: {
			filepath,
			id,
			basename,
		},
	};
}
