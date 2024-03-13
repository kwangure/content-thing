import { cwd } from 'process';
import path from 'node:path';

export function parseFilepath(filepath: string) {
	const matcher = new RegExp(
		`${cwd()}/src/thing/collections/([^/]+)/(.+)/([^/]+)$`,
	);
	const match = matcher.exec(filepath);
	if (!match) {
		throw Error(`Filepath '${filepath}' is not a valid collection entry.`);
	}
	const [, collection, id, basename] = match;
	return {
		collection: {
			name: collection,
			filepath: path.join(cwd(), '/src/thing/collections/', collection),
		},
		entry: {
			filepath,
			id,
			basename,
		},
	};
}
