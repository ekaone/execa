import {Readable, Writable, PassThrough} from 'node:stream';
import {foobarString} from './input.js';

export const noopReadable = () => new Readable({read() {}});
export const noopWritable = () => new Writable({write() {}});
export const noopDuplex = () => new PassThrough().resume();
export const simpleReadable = () => Readable.from([foobarString]);
