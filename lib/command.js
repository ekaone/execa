import {execa} from './async.js';
import {execaSync} from './sync.js';

export function execaCommand(command, options) {
	const [file, ...args] = parseCommand(command);
	return execa(file, args, options);
}

export function execaCommandSync(command, options) {
	const [file, ...args] = parseCommand(command);
	return execaSync(file, args, options);
}

const parseCommand = command => {
	if (typeof command !== 'string') {
		throw new TypeError(`First argument must be a string: ${command}.`);
	}

	const tokens = [];
	for (const token of command.trim().split(SPACES_REGEXP)) {
		// Allow spaces to be escaped by a backslash if not meant as a delimiter
		const previousToken = tokens.at(-1);
		if (previousToken && previousToken.endsWith('\\')) {
			// Merge previous token with current one
			tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
		} else {
			tokens.push(token);
		}
	}

	return tokens;
};

const SPACES_REGEXP = / +/g;
