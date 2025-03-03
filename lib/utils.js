import {Buffer} from 'node:buffer';
import {ChildProcess} from 'node:child_process';
import {addAbortListener} from 'node:events';
import process from 'node:process';

export const bufferToUint8Array = buffer => new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

export const isUint8Array = value => Object.prototype.toString.call(value) === '[object Uint8Array]' && !Buffer.isBuffer(value);
export const isBinary = value => isUint8Array(value) || Buffer.isBuffer(value);

const textDecoder = new TextDecoder();
export const binaryToString = uint8ArrayOrBuffer => textDecoder.decode(uint8ArrayOrBuffer);

export const isStandardStream = stream => STANDARD_STREAMS.includes(stream);
export const STANDARD_STREAMS = [process.stdin, process.stdout, process.stderr];
export const STANDARD_STREAMS_ALIASES = ['stdin', 'stdout', 'stderr'];

export const incrementMaxListeners = (eventEmitter, maxListenersIncrement, signal) => {
	const maxListeners = eventEmitter.getMaxListeners();
	if (maxListeners === 0 || maxListeners === Number.POSITIVE_INFINITY) {
		return;
	}

	eventEmitter.setMaxListeners(maxListeners + maxListenersIncrement);
	addAbortListener(signal, () => {
		eventEmitter.setMaxListeners(eventEmitter.getMaxListeners() - maxListenersIncrement);
	});
};

export const isChildProcess = value => value instanceof ChildProcess;
