import {DiscardedError} from '../return/error.js';

export const waitForSuccessfulExit = async exitPromise => {
	const [exitCode, signal] = await exitPromise;

	if (!isProcessErrorExit(exitCode, signal) && isFailedExit(exitCode, signal)) {
		throw new DiscardedError();
	}

	return [exitCode, signal];
};

const isProcessErrorExit = (exitCode, signal) => exitCode === undefined && signal === undefined;
export const isFailedExit = (exitCode, signal) => exitCode !== 0 || signal !== null;
