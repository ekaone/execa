import {type ChildProcess} from 'node:child_process';
import {type Readable, type Writable} from 'node:stream';

type IfAsync<IsSync extends boolean, AsyncValue, SyncValue = never> = IsSync extends true ? SyncValue : AsyncValue;

// When the `stdin`/`stdout`/`stderr`/`stdio` option is set to one of those values, no stream is created
type NoStreamStdioOption =
	| 'ignore'
	| 'inherit'
	| 'ipc'
	| number
	| Readable
	| Writable
	| [NoStreamStdioOption];

type BaseStdioOption =
	| 'pipe'
	| 'overlapped'
	| 'ignore'
	| 'inherit';

// @todo Use `string`, `Uint8Array` or `unknown` for both the argument and the return type, based on whether `encoding: 'buffer'` and `objectMode: true` are used.
// See https://github.com/sindresorhus/execa/issues/694
type StdioTransform = (chunk: unknown) => AsyncGenerator<unknown, void, void> | Generator<unknown, void, void>;
type StdioFinal = () => AsyncGenerator<unknown, void, void> | Generator<unknown, void, void>;

type StdioTransformFull = {
	transform: StdioTransform;
	final?: StdioFinal;
	binary?: boolean;
	objectMode?: boolean;
};

type CommonStdioOption<IsSync extends boolean = boolean> =
	| BaseStdioOption
	| 'ipc'
	| number
	| undefined
	| URL
	| {file: string}
	| IfAsync<IsSync,
	| StdioTransform
	| StdioTransformFull>;

type InputStdioOption<IsSync extends boolean = boolean> =
	| Uint8Array
	| Readable
	| IfAsync<IsSync,
	| Iterable<unknown>
	| AsyncIterable<unknown>
	| ReadableStream>;

type OutputStdioOption<IsSync extends boolean = boolean> =
	| Writable
	| IfAsync<IsSync, WritableStream>;

type StdinSingleOption<IsSync extends boolean = boolean> =
	| CommonStdioOption<IsSync>
	| InputStdioOption<IsSync>;
export type StdinOption<IsSync extends boolean = boolean> =
	| StdinSingleOption<IsSync>
	| Array<StdinSingleOption<IsSync>>;
type StdoutStderrSingleOption<IsSync extends boolean = boolean> =
  | CommonStdioOption<IsSync>
  | OutputStdioOption<IsSync>;
export type StdoutStderrOption<IsSync extends boolean = boolean> =
	| StdoutStderrSingleOption<IsSync>
	| Array<StdoutStderrSingleOption<IsSync>>;
type StdioSingleOption<IsSync extends boolean = boolean> =
	| CommonStdioOption<IsSync>
	| InputStdioOption<IsSync>
	| OutputStdioOption<IsSync>;
export type StdioOption<IsSync extends boolean = boolean> =
	| StdioSingleOption<IsSync>
	| Array<StdioSingleOption<IsSync>>;

type StdioOptionsArray<IsSync extends boolean = boolean> = readonly [
	StdinOption<IsSync>,
	StdoutStderrOption<IsSync>,
	StdoutStderrOption<IsSync>,
	...Array<StdioOption<IsSync>>,
];

type StdioOptions<IsSync extends boolean = boolean> = BaseStdioOption | StdioOptionsArray<IsSync>;

type EncodingOption =
  | 'utf8'
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'latin1'
  | 'binary'
  | 'ascii'
  | 'hex'
  | 'base64'
  | 'base64url'
  | 'buffer'
  | undefined;
type DefaultEncodingOption = 'utf8';
type BufferEncodingOption = 'buffer';

// Whether `result.stdout|stderr|all` is an array of values due to `objectMode: true`
type IsObjectStream<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = IsObjectModeStream<FdNumber, IsObjectOutputOptions<StreamOption<FdNumber, OptionsType>>, OptionsType>;

type IsObjectModeStream<
	FdNumber extends string,
	IsObjectModeStreamOption extends boolean,
	OptionsType extends CommonOptions = CommonOptions,
> = IsObjectModeStreamOption extends true
	? true
	: IsObjectOutputOptions<StdioProperty<FdNumber, OptionsType>>;

type IsObjectOutputOptions<OutputOptions extends StdioOption> = IsObjectOutputOption<OutputOptions extends StdioSingleOption[]
	? OutputOptions[number]
	: OutputOptions
>;

type IsObjectOutputOption<OutputOption extends StdioSingleOption> = OutputOption extends StdioTransformFull
	? BooleanObjectMode<OutputOption['objectMode']>
	: false;

type BooleanObjectMode<ObjectModeOption extends StdioTransformFull['objectMode']> = ObjectModeOption extends true ? true : false;

// Whether `result.stdout|stderr|all` is `undefined`, excluding the `buffer` option
type IgnoresStreamResult<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = IgnoresStreamReturn<FdNumber, IgnoresStdioResult<StreamOption<FdNumber, OptionsType>>, OptionsType>;

type IgnoresStreamReturn<
	FdNumber extends string,
	IsIgnoredStreamOption extends boolean,
	OptionsType extends CommonOptions = CommonOptions,
> = IsIgnoredStreamOption extends true
	? true
	: IgnoresStdioResult<StdioProperty<FdNumber, OptionsType>>;

// Whether `result.stdio[*]` is `undefined`
type IgnoresStdioResult<StdioOptionType extends StdioOption> = StdioOptionType extends NoStreamStdioOption ? true : false;

// Whether `result.stdout|stderr|all` is `undefined`
type IgnoresStreamOutput<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = LacksBuffer<OptionsType['buffer']> extends true
	? true
	: IsInputStdioDescriptor<FdNumber, OptionsType> extends true
		? true
		: IgnoresStreamResult<FdNumber, OptionsType>;

type LacksBuffer<BufferOption extends Options['buffer']> = BufferOption extends false ? true : false;

// Whether `result.stdio[FdNumber]` is an input stream
type IsInputStdioDescriptor<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = FdNumber extends '0'
	? true
	: IsInputStdio<StdioProperty<FdNumber, OptionsType>>;

// Whether `result.stdio[3+]` is an input stream
type IsInputStdio<StdioOptionType extends StdioOption> = StdioOptionType extends StdinOption
	? StdioOptionType extends StdoutStderrOption
		? false
		: true
	: false;

// `options.stdin|stdout|stderr`
type StreamOption<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = string extends FdNumber ? StdioOption
	: FdNumber extends '0' ? OptionsType['stdin']
		: FdNumber extends '1' ? OptionsType['stdout']
			: FdNumber extends '2' ? OptionsType['stderr']
				: undefined;

// `options.stdio[FdNumber]`
type StdioProperty<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = StdioOptionProperty<FdNumber, StdioArrayOption<OptionsType>>;

type StdioOptionProperty<
	FdNumber extends string,
	StdioOptionsType extends StdioOptions,
> = string extends FdNumber
	? StdioOption | undefined
	: StdioOptionsType extends StdioOptionsArray
		? FdNumber extends keyof StdioOptionsType
			? StdioOptionsType[FdNumber]
			: undefined
		: undefined;

// Type of `result.stdout|stderr`
type StdioOutput<
	FdNumber extends string,
	OptionsType extends CommonOptions = CommonOptions,
> = StdioOutputResult<FdNumber, IgnoresStreamOutput<FdNumber, OptionsType>, OptionsType>;

type StdioOutputResult<
	FdNumber extends string,
	StreamOutputIgnored extends boolean,
	OptionsType extends CommonOptions = CommonOptions,
> = StreamOutputIgnored extends true
	? undefined
	: StreamEncoding<IsObjectStream<FdNumber, OptionsType>, OptionsType['lines'], OptionsType['encoding']>;

type StreamEncoding<
	IsObjectResult extends boolean,
	LinesOption extends CommonOptions['lines'],
	Encoding extends CommonOptions['encoding'],
> = IsObjectResult extends true ? unknown[]
	: LinesOption extends true
		? Encoding extends 'buffer' ? Uint8Array[] : string[]
		: Encoding extends 'buffer' ? Uint8Array : string;

// Type of `result.all`
type AllOutput<OptionsType extends Options = Options> = AllOutputProperty<OptionsType['all'], OptionsType>;

type AllOutputProperty<
	AllOption extends Options['all'] = Options['all'],
	OptionsType extends Options = Options,
> = AllOption extends true
	? StdioOutput<AllUsesStdout<OptionsType> extends true ? '1' : '2', OptionsType>
	: undefined;

type AllUsesStdout<OptionsType extends Options = Options> = IgnoresStreamOutput<'1', OptionsType> extends true
	? false
	: IgnoresStreamOutput<'2', OptionsType> extends true
		? true
		: IsObjectStream<'2', OptionsType> extends true
			? false
			: IsObjectStream<'1', OptionsType>;

// Type of `result.stdio`
type StdioArrayOutput<OptionsType extends CommonOptions = CommonOptions> = MapStdioOptions<StdioArrayOption<OptionsType>, OptionsType>;

type MapStdioOptions<
	StdioOptionsArrayType extends StdioOptionsArray,
	OptionsType extends CommonOptions = CommonOptions,
> = {
	[FdNumber in keyof StdioOptionsArrayType]: StdioOutput<
	FdNumber extends string ? FdNumber : string,
	OptionsType
	>
};

// `stdio` option
type StdioArrayOption<OptionsType extends CommonOptions = CommonOptions> = OptionsType['stdio'] extends StdioOptionsArray
	? OptionsType['stdio']
	: OptionsType['stdio'] extends StdinOption
		? OptionsType['stdio'] extends StdoutStderrOption
			? [OptionsType['stdio'], OptionsType['stdio'], OptionsType['stdio']]
			: DefaultStdio
		: DefaultStdio;

type DefaultStdio = ['pipe', 'pipe', 'pipe'];

type StricterOptions<
	WideOptions extends CommonOptions,
	StrictOptions extends CommonOptions,
> = WideOptions extends StrictOptions ? WideOptions : StrictOptions;

type CommonOptions<IsSync extends boolean = boolean> = {
	/**
	Prefer locally installed binaries when looking for a binary to execute.

	If you `$ npm install foo`, you can then `execa('foo')`.

	@default `true` with `$`, `false` otherwise
	*/
	readonly preferLocal?: boolean;

	/**
	Preferred path to find locally installed binaries in (use with `preferLocal`).

	@default process.cwd()
	*/
	readonly localDir?: string | URL;

	/**
	If `true`, runs with Node.js. The first argument must be a Node.js file.

	@default `true` with `execaNode()`, `false` otherwise
	*/
	readonly node?: boolean;

	/**
	Path to the Node.js executable.

	For example, this can be used together with [`get-node`](https://github.com/ehmicky/get-node) to run a specific Node.js version.

	Requires the `node` option to be `true`.

	@default [`process.execPath`](https://nodejs.org/api/process.html#process_process_execpath) (current Node.js executable)
	*/
	readonly nodePath?: string | URL;

	/**
	List of [CLI options](https://nodejs.org/api/cli.html#cli_options) passed to the Node.js executable.

	Requires the `node` option to be `true`.

	@default [`process.execArgv`](https://nodejs.org/api/process.html#process_process_execargv) (current Node.js CLI options)
	*/
	readonly nodeOptions?: string[];

	/**
	Write some input to the child process' `stdin`.

	See also the `inputFile` and `stdin` options.
	*/
	readonly input?: string | Uint8Array | Readable;

	/**
	Use a file as input to the child process' `stdin`.

	See also the `input` and `stdin` options.
	*/
	readonly inputFile?: string | URL;

	/**
	[How to setup](https://nodejs.org/api/child_process.html#child_process_options_stdio) the child process' standard input. This can be:
	- `'pipe'`: Sets [`childProcess.stdin`](https://nodejs.org/api/child_process.html#subprocessstdin) stream.
	- `'overlapped'`: Like `'pipe'` but asynchronous on Windows.
	- `'ignore'`: Do not use `stdin`.
	- `'inherit'`: Re-use the current process' `stdin`.
	- an integer: Re-use a specific file descriptor from the current process.
	- a Node.js `Readable` stream.
	- `{ file: 'path' }` object.
	- a file URL.
	- a web [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).
	- an [`Iterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterable_protocol) or an [`AsyncIterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols)
	- an `Uint8Array`.

	This can be an [array of values](https://github.com/sindresorhus/execa#redirect-stdinstdoutstderr-to-multiple-destinations) such as `['inherit', 'pipe']` or `[filePath, 'pipe']`.

	This can also be a generator function to transform the input. [Learn more.](https://github.com/sindresorhus/execa/tree/main/docs/transform.md)

	@default `inherit` with `$`, `pipe` otherwise
	*/
	readonly stdin?: StdinOption<IsSync>;

	/**
	[How to setup](https://nodejs.org/api/child_process.html#child_process_options_stdio) the child process' standard output. This can be:
	- `'pipe'`: Sets `childProcessResult.stdout` (as a string or `Uint8Array`) and [`childProcess.stdout`](https://nodejs.org/api/child_process.html#subprocessstdout) (as a stream).
	- `'overlapped'`: Like `'pipe'` but asynchronous on Windows.
	- `'ignore'`: Do not use `stdout`.
	- `'inherit'`: Re-use the current process' `stdout`.
	- an integer: Re-use a specific file descriptor from the current process.
	- a Node.js `Writable` stream.
	- `{ file: 'path' }` object.
	- a file URL.
	- a web [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream).

	This can be an [array of values](https://github.com/sindresorhus/execa#redirect-stdinstdoutstderr-to-multiple-destinations) such as `['inherit', 'pipe']` or `[filePath, 'pipe']`.

	This can also be a generator function to transform the output. [Learn more.](https://github.com/sindresorhus/execa/tree/main/docs/transform.md)

	@default 'pipe'
	*/
	readonly stdout?: StdoutStderrOption<IsSync>;

	/**
	[How to setup](https://nodejs.org/api/child_process.html#child_process_options_stdio) the child process' standard error. This can be:
	- `'pipe'`: Sets `childProcessResult.stderr` (as a string or `Uint8Array`) and [`childProcess.stderr`](https://nodejs.org/api/child_process.html#subprocessstderr) (as a stream).
	- `'overlapped'`: Like `'pipe'` but asynchronous on Windows.
	- `'ignore'`: Do not use `stderr`.
	- `'inherit'`: Re-use the current process' `stderr`.
	- an integer: Re-use a specific file descriptor from the current process.
	- a Node.js `Writable` stream.
	- `{ file: 'path' }` object.
	- a file URL.
	- a web [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream).

	This can be an [array of values](https://github.com/sindresorhus/execa#redirect-stdinstdoutstderr-to-multiple-destinations) such as `['inherit', 'pipe']` or `[filePath, 'pipe']`.

	This can also be a generator function to transform the output. [Learn more.](https://github.com/sindresorhus/execa/tree/main/docs/transform.md)

	@default 'pipe'
	*/
	readonly stderr?: StdoutStderrOption<IsSync>;

	/**
	Like the `stdin`, `stdout` and `stderr` options but for all file descriptors at once. For example, `{stdio: ['ignore', 'pipe', 'pipe']}` is the same as `{stdin: 'ignore', stdout: 'pipe', stderr: 'pipe'}`.

	A single string can be used as a shortcut. For example, `{stdio: 'pipe'}` is the same as `{stdin: 'pipe', stdout: 'pipe', stderr: 'pipe'}`.

	The array can have more than 3 items, to create additional file descriptors beyond `stdin`/`stdout`/`stderr`. For example, `{stdio: ['pipe', 'pipe', 'pipe', 'pipe']}` sets a fourth file descriptor.

	@default 'pipe'
	*/
	readonly stdio?: StdioOptions<IsSync>;

	/**
	Split `stdout` and `stderr` into lines.
	- `result.stdout`, `result.stderr`, `result.all` and `result.stdio` are arrays of lines.
	- `childProcess.stdout`, `childProcess.stderr`, `childProcess.all` and `childProcess.stdio` iterate over lines instead of arbitrary chunks.
	- Any stream passed to the `stdout`, `stderr` or `stdio` option receives lines instead of arbitrary chunks.

	@default false
	*/
	readonly lines?: IfAsync<IsSync, boolean>;

	/**
	Setting this to `false` resolves the promise with the error instead of rejecting it.

	@default true
	*/
	readonly reject?: boolean;

	/**
	Strip the final [newline character](https://en.wikipedia.org/wiki/Newline) from the output.

	@default true
	*/
	readonly stripFinalNewline?: boolean;

	/**
	If `true`, the child process uses both the `env` option and the current process' environment variables ([`process.env`](https://nodejs.org/api/process.html#processenv)).
	If `false`, only the `env` option is used, not `process.env`.

	@default true
	*/
	readonly extendEnv?: boolean;

	/**
	Current working directory of the child process.

	This is also used to resolve the `nodePath` option when it is a relative path.

	@default process.cwd()
	*/
	readonly cwd?: string | URL;

	/**
	Environment key-value pairs.

	Unless the `extendEnv` option is `false`, the child process also uses the current process' environment variables ([`process.env`](https://nodejs.org/api/process.html#processenv)).

	@default process.env
	*/
	readonly env?: NodeJS.ProcessEnv;

	/**
	Explicitly set the value of `argv[0]` sent to the child process. This will be set to `command` or `file` if not specified.
	*/
	readonly argv0?: string;

	/**
	Sets the user identity of the process.
	*/
	readonly uid?: number;

	/**
	Sets the group identity of the process.
	*/
	readonly gid?: number;

	/**
	If `true`, runs `command` inside of a shell. Uses `/bin/sh` on UNIX and `cmd.exe` on Windows. A different shell can be specified as a string. The shell should understand the `-c` switch on UNIX or `/d /s /c` on Windows.

	We recommend against using this option since it is:
	- not cross-platform, encouraging shell-specific syntax.
	- slower, because of the additional shell interpretation.
	- unsafe, potentially allowing command injection.

	@default false
	*/
	readonly shell?: boolean | string | URL;

	/**
	Specify the character encoding used to decode the `stdout`, `stderr` and `stdio` output. If set to `'buffer'`, then `stdout`, `stderr` and `stdio` will be `Uint8Array`s instead of strings.

	@default 'utf8'
	*/
	readonly encoding?: EncodingOption;

	/**
	If `timeout` is greater than `0`, the child process will be [terminated](#killsignal) if it runs for longer than that amount of milliseconds.

	@default 0
	*/
	readonly timeout?: number;

	/**
	Largest amount of data in bytes allowed on `stdout`, `stderr` and `stdio`. Default: 100 MB.

	@default 100_000_000
	*/
	readonly maxBuffer?: number;

	/**
	Signal used to terminate the child process when:
	- using the `cancelSignal`, `timeout`, `maxBuffer` or `cleanup` option
	- calling [`subprocess.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal) with no arguments

	This can be either a name (like `"SIGTERM"`) or a number (like `9`).

	@default 'SIGTERM'
	*/
	readonly killSignal?: string | number;

	/**
	If the child process is terminated but does not exit, forcefully exit it by sending [`SIGKILL`](https://en.wikipedia.org/wiki/Signal_(IPC)#SIGKILL).

	The grace period is 5 seconds by default. This feature can be disabled with `false`.

	This works when the child process is terminated by either:
	- the `cancelSignal`, `timeout`, `maxBuffer` or `cleanup` option
	- calling [`subprocess.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal) with no arguments

	This does not work when the child process is terminated by either:
	- calling [`subprocess.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal) with an argument
	- calling [`process.kill(subprocess.pid)`](https://nodejs.org/api/process.html#processkillpid-signal)
	- sending a termination signal from another process

	Also, this does not work on Windows, because Windows [doesn't support signals](https://nodejs.org/api/process.html#process_signal_events): `SIGKILL` and `SIGTERM` both terminate the process immediately. Other packages (such as [`taskkill`](https://github.com/sindresorhus/taskkill)) can be used to achieve fail-safe termination on Windows.

	@default 5000
	*/
	forceKillAfterDelay?: number | false;

	/**
	If `true`, no quoting or escaping of arguments is done on Windows. Ignored on other platforms. This is set to `true` automatically when the `shell` option is `true`.

	@default false
	*/
	readonly windowsVerbatimArguments?: boolean;

	/**
	On Windows, do not create a new console window. Please note this also prevents `CTRL-C` [from working](https://github.com/nodejs/node/issues/29837) on Windows.

	@default true
	*/
	readonly windowsHide?: boolean;

	/**
	If `verbose` is `'short'` or `'full'`, prints each command on `stderr` before executing it. When the command completes, prints its duration and (if it failed) its error.

	If `verbose` is `'full'`, the command's `stdout` and `stderr` are printed too, unless either:
	- the `stdout`/`stderr` option is `ignore` or `inherit`.
	- the `stdout`/`stderr` is redirected to [a stream](https://nodejs.org/api/stream.html#readablepipedestination-options), a file, a file descriptor, or another child process.
	- the `encoding` option is set.

	This can also be set to `'full'` by setting the `NODE_DEBUG=execa` environment variable in the current process.

	@default 'none'
	*/
	readonly verbose?: 'none' | 'short' | 'full';

	/**
	Kill the spawned process when the parent process exits unless either:
	- the spawned process is [`detached`](https://nodejs.org/api/child_process.html#child_process_options_detached)
	- the parent process is terminated abruptly, for example, with `SIGKILL` as opposed to `SIGTERM` or a normal exit

	@default true
	*/
	readonly cleanup?: IfAsync<IsSync, boolean>;

	/**
	Whether to return the child process' output using the `result.stdout`, `result.stderr`, `result.all` and `result.stdio` properties.

	On failure, the `error.stdout`, `error.stderr`, `error.all` and `error.stdio` properties are used instead.

	When `buffer` is `false`, the output can still be read using the `childProcess.stdout`, `childProcess.stderr`, `childProcess.stdio` and `childProcess.all` streams. If the output is read, this should be done right away to avoid missing any data.

	@default true
	*/
	readonly buffer?: IfAsync<IsSync, boolean>;

	/**
	Add an `.all` property on the promise and the resolved value. The property contains the output of the process with `stdout` and `stderr` interleaved.

	@default false
	*/
	readonly all?: IfAsync<IsSync, boolean>;

	/**
	Enables exchanging messages with the child process using [`childProcess.send(value)`](https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback) and [`childProcess.on('message', (value) => {})`](https://nodejs.org/api/child_process.html#event-message).

	@default `true` if the `node` option is enabled, `false` otherwise
	*/
	readonly ipc?: IfAsync<IsSync, boolean>;

	/**
	Specify the kind of serialization used for sending messages between processes when using the `ipc` option:
	- `json`: Uses `JSON.stringify()` and `JSON.parse()`.
	- `advanced`: Uses [`v8.serialize()`](https://nodejs.org/api/v8.html#v8_v8_serialize_value)

	[More info.](https://nodejs.org/api/child_process.html#child_process_advanced_serialization)

	@default 'json'
	*/
	readonly serialization?: IfAsync<IsSync, 'json' | 'advanced'>;

	/**
	Prepare child to run independently of its parent process. Specific behavior [depends on the platform](https://nodejs.org/api/child_process.html#child_process_options_detached).

	@default false
	*/
	readonly detached?: IfAsync<IsSync, boolean>;

	/**
	You can abort the spawned process using [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

	When `AbortController.abort()` is called, [`.isCanceled`](https://github.com/sindresorhus/execa#iscanceled) becomes `true`.

	@example
	```
	import {execa} from 'execa';

	const abortController = new AbortController();
	const subprocess = execa('node', [], {cancelSignal: abortController.signal});

	setTimeout(() => {
		abortController.abort();
	}, 1000);

	try {
		await subprocess;
	} catch (error) {
		console.log(error.isTerminated); // true
		console.log(error.isCanceled); // true
	}
	```
	*/
	readonly cancelSignal?: IfAsync<IsSync, AbortSignal>;
};

export type Options = CommonOptions<false>;
export type SyncOptions = CommonOptions<true>;

/**
Result of a child process execution. On success this is a plain object. On failure this is also an `Error` instance.

The child process fails when:
- its exit code is not `0`
- it was terminated with a signal
- timing out
- being canceled
- there's not enough memory or there are already too many child processes
*/
type ExecaCommonReturnValue<IsSync extends boolean = boolean, OptionsType extends CommonOptions = CommonOptions> = {
	/**
	The file and arguments that were run, for logging purposes.

	This is not escaped and should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	command: string;

	/**
	Same as `command` but escaped.

	Unlike `command`, control characters are escaped, which makes it safe to print in a terminal.

	This can also be copied and pasted into a shell, for debugging purposes.
	Since the escaping is fairly basic, this should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	escapedCommand: string;

	/**
	The numeric exit code of the process that was run.

	This is `undefined` when the process could not be spawned or was terminated by a [signal](#signal).
	*/
	exitCode?: number;

	/**
	The output of the process on `stdout`.

	This is `undefined` if the `stdout` option is set to only [`'inherit'`, `'ignore'`, `Stream` or `integer`](https://nodejs.org/api/child_process.html#child_process_options_stdio). This is an array if the `lines` option is `true`, or if the `stdout` option is a transform in object mode.
	*/
	stdout: StdioOutput<'1', OptionsType>;

	/**
	The output of the process on `stderr`.

	This is `undefined` if the `stderr` option is set to only [`'inherit'`, `'ignore'`, `Stream` or `integer`](https://nodejs.org/api/child_process.html#child_process_options_stdio). This is an array if the `lines` option is `true`, or if the `stderr` option is a transform in object mode.
	*/
	stderr: StdioOutput<'2', OptionsType>;

	/**
	The output of the process on `stdin`, `stdout`, `stderr` and other file descriptors.

	Items are `undefined` when their corresponding `stdio` option is set to only [`'inherit'`, `'ignore'`, `Stream` or `integer`](https://nodejs.org/api/child_process.html#child_process_options_stdio). Items are arrays when their corresponding `stdio` option is a transform in object mode.
	*/
	stdio: StdioArrayOutput<OptionsType>;

	/**
	Whether the process failed to run.
	*/
	failed: boolean;

	/**
	Whether the process timed out.
	*/
	timedOut: boolean;

	/**
	Whether the process was terminated by a signal (like `SIGTERM`) sent by either:
	- The current process.
	- Another process. This case is [not supported on Windows](https://nodejs.org/api/process.html#signal-events).
	*/
	isTerminated: boolean;

	/**
	The name of the signal (like `SIGTERM`) that terminated the process, sent by either:
	- The current process.
	- Another process. This case is [not supported on Windows](https://nodejs.org/api/process.html#signal-events).

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`.
	*/
	signal?: string;

	/**
	A human-friendly description of the signal that was used to terminate the process. For example, `Floating point arithmetic error`.

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`. It is also `undefined` when the signal is very uncommon which should seldomly happen.
	*/
	signalDescription?: string;

	/**
	The current directory in which the command was run.
	*/
	cwd: string;

	/**
	Whether the process was canceled using the `cancelSignal` option.
	*/
	isCanceled: boolean;

	/**
	The output of the process with `stdout` and `stderr` interleaved.

	This is `undefined` if either:
	- the `all` option is `false` (default value)
	- both `stdout` and `stderr` options are set to [`'inherit'`, `'ignore'`, `Stream` or `integer`](https://nodejs.org/api/child_process.html#child_process_options_stdio)

	This is an array if the `lines` option is `true`, or if either the `stdout` or `stderr` option is a transform in object mode.
	*/
	all: IfAsync<IsSync, AllOutput<OptionsType>>;

	/**
	Results of the other processes that were piped into this child process. This is useful to inspect a series of child processes piped with each other.

	This array is initially empty and is populated each time the `.pipe()` method resolves.
	*/
	pipedFrom: IfAsync<IsSync, ExecaReturnValue[], []>;
	// Workaround for a TypeScript bug: https://github.com/microsoft/TypeScript/issues/57062
} & {};

export type ExecaReturnValue<OptionsType extends Options = Options> = ExecaCommonReturnValue<false, OptionsType> & ErrorUnlessReject<OptionsType['reject']>;
export type ExecaSyncReturnValue<OptionsType extends SyncOptions = SyncOptions> = ExecaCommonReturnValue<true, OptionsType> & ErrorUnlessReject<OptionsType['reject']>;

type ErrorUnlessReject<RejectOption extends CommonOptions['reject']> = RejectOption extends false
	? Partial<ExecaCommonError>
	: {};

type ExecaCommonError = {
	/**
	Error message when the child process failed to run. In addition to the underlying error message, it also contains some information related to why the child process errored.

	The child process `stderr`, `stdout` and other file descriptors' output are appended to the end, separated with newlines and not interleaved.
	*/
	message: string;

	/**
	This is the same as the `message` property except it does not include the child process `stdout`/`stderr`/`stdio`.
	*/
	shortMessage: string;

	/**
	Original error message. This is the same as the `message` property excluding the child process `stdout`/`stderr`/`stdio` and some additional information added by Execa.

	This is `undefined` unless the child process exited due to an `error` event or a timeout.
	*/
	originalMessage?: string;
} & Error;

export type ExecaError<OptionsType extends Options = Options> = ExecaCommonReturnValue<false, OptionsType> & ExecaCommonError;
export type ExecaSyncError<OptionsType extends SyncOptions = SyncOptions> = ExecaCommonReturnValue<true, OptionsType> & ExecaCommonError;

type StreamUnlessIgnored<
	FdNumber extends string,
	OptionsType extends Options = Options,
> = ChildProcessStream<FdNumber, IgnoresStreamResult<FdNumber, OptionsType>, OptionsType>;

type ChildProcessStream<
	FdNumber extends string,
	StreamResultIgnored extends boolean,
	OptionsType extends Options = Options,
> = StreamResultIgnored extends true
	? null
	: InputOutputStream<IsInputStdioDescriptor<FdNumber, OptionsType>>;

type InputOutputStream<IsInput extends boolean> = IsInput extends true
	? Writable
	: Readable;

type AllStream<OptionsType extends Options = Options> = AllStreamProperty<OptionsType['all'], OptionsType>;

type AllStreamProperty<
	AllOption extends Options['all'] = Options['all'],
	OptionsType extends Options = Options,
> = AllOption extends true
	? AllIfStdout<IgnoresStreamResult<'1', OptionsType>, OptionsType>
	: undefined;

type AllIfStdout<
	StdoutResultIgnored extends boolean,
	OptionsType extends Options = Options,
> = StdoutResultIgnored extends true
	? AllIfStderr<IgnoresStreamResult<'2', OptionsType>>
	: Readable;

type AllIfStderr<StderrResultIgnored extends boolean> = StderrResultIgnored extends true
	? undefined
	: Readable;

type PipeOptions = {
	/**
	Which stream to pipe. A file descriptor number can also be passed.

	`"all"` pipes both `stdout` and `stderr`. This requires the `all` option to be `true`.
	*/
	readonly from?: 'stdout' | 'stderr' | 'all' | number;

	/**
	Unpipe the child process when the signal aborts.

	The `.pipe()` method will be rejected with a cancellation error.
	*/
	readonly unpipeSignal?: AbortSignal;
};

type PipableProcess = {
	/**
	[Pipe](https://nodejs.org/api/stream.html#readablepipedestination-options) the child process' `stdout` to a second Execa child process' `stdin`. This resolves with that second process' result. If either process is rejected, this is rejected with that process' error instead.

	This follows the same syntax as `execa(file, arguments?, options?)` except both regular options and pipe-specific options can be specified.

	This can be called multiple times to chain a series of processes.

	Multiple child processes can be piped to the same process. Conversely, the same child process can be piped to multiple other processes.

	This is usually the preferred method to pipe processes.
	*/
	pipe<OptionsType extends Options & PipeOptions = {}>(
		file: string | URL,
		arguments?: readonly string[],
		options?: OptionsType,
	): Promise<ExecaReturnValue<OptionsType>> & PipableProcess;
	pipe<OptionsType extends Options & PipeOptions = {}>(
		file: string | URL,
		options?: OptionsType,
	): Promise<ExecaReturnValue<OptionsType>> & PipableProcess;

	/**
	Like `.pipe(file, arguments?, options?)` but using a `command` template string instead. This follows the same syntax as `$`.

	This is the preferred method to pipe processes when using `$`.
	*/
	pipe(templates: TemplateStringsArray, ...expressions: readonly TemplateExpression[]):
	Promise<ExecaReturnValue<{}>> & PipableProcess;
	pipe<OptionsType extends Options & PipeOptions = {}>(options: OptionsType):
	(templates: TemplateStringsArray, ...expressions: readonly TemplateExpression[])
	=> Promise<ExecaReturnValue<OptionsType>> & PipableProcess;

	/**
	Like `.pipe(file, arguments?, options?)` but using the return value of another `execa()` call instead.

	This is the most advanced method to pipe processes. It is useful in specific cases, such as piping multiple child processes to the same process.
	*/
	pipe<Destination extends ExecaChildProcess>(destination: Destination, options?: PipeOptions):
	Promise<Awaited<Destination>> & PipableProcess;
};

export type ExecaChildPromise<OptionsType extends Options = Options> = {
	stdin: StreamUnlessIgnored<'0', OptionsType>;

	stdout: StreamUnlessIgnored<'1', OptionsType>;

	stderr: StreamUnlessIgnored<'2', OptionsType>;

	/**
	Stream combining/interleaving [`stdout`](https://nodejs.org/api/child_process.html#child_process_subprocess_stdout) and [`stderr`](https://nodejs.org/api/child_process.html#child_process_subprocess_stderr).

	This is `undefined` if either:
	- the `all` option is `false` (the default value)
	- both `stdout` and `stderr` options are set to [`'inherit'`, `'ignore'`, `Stream` or `integer`](https://nodejs.org/api/child_process.html#child_process_options_stdio)
	*/
	all: AllStream<OptionsType>;

	catch<ResultType = never>(
		onRejected?: (reason: ExecaError<OptionsType>) => ResultType | PromiseLike<ResultType>
	): Promise<ExecaReturnValue<OptionsType> | ResultType>;

	/**
	Sends a [signal](https://nodejs.org/api/os.html#signal-constants) to the child process. The default signal is the `killSignal` option. `killSignal` defaults to `SIGTERM`, which terminates the child process.

	This returns `false` when the signal could not be sent, for example when the child process has already exited.

	When an error is passed as argument, its message and stack trace are kept in the child process' error. The child process is then terminated with the default signal. This does not emit the [`error` event](https://nodejs.org/api/child_process.html#event-error).

	[More info.](https://nodejs.org/api/child_process.html#subprocesskillsignal)
	*/
	kill(signal: Parameters<ChildProcess['kill']>[0], error?: Error): ReturnType<ChildProcess['kill']>;
	kill(error?: Error): ReturnType<ChildProcess['kill']>;
} & PipableProcess;

export type ExecaChildProcess<OptionsType extends Options = Options> = ChildProcess &
ExecaChildPromise<OptionsType> &
Promise<ExecaReturnValue<OptionsType>>;

/**
Executes a command using `file ...arguments`.

Arguments are automatically escaped. They can contain any character, including spaces.

This is the preferred method when executing single commands.

@param file - The program/script to execute, as a string or file URL
@param arguments - Arguments to pass to `file` on execution.
@returns An `ExecaChildProcess` that is both:
- a `Promise` resolving or rejecting with a `childProcessResult`.
- a [`child_process` instance](https://nodejs.org/api/child_process.html#child_process_class_childprocess) with some additional methods and properties.
@throws A `childProcessResult` error

@example <caption>Promise interface</caption>
```
import {execa} from 'execa';

const {stdout} = await execa('echo', ['unicorns']);
console.log(stdout);
//=> 'unicorns'
```

@example <caption>Redirect output to a file</caption>
```
import {execa} from 'execa';

// Similar to `echo unicorns > stdout.txt` in Bash
await execa('echo', ['unicorns'], {stdout: {file: 'stdout.txt'}});

// Similar to `echo unicorns 2> stdout.txt` in Bash
await execa('echo', ['unicorns'], {stderr: {file: 'stderr.txt'}});

// Similar to `echo unicorns &> stdout.txt` in Bash
await execa('echo', ['unicorns'], {stdout: {file: 'all.txt'}, stderr: {file: 'all.txt'}});
```

@example <caption>Redirect input from a file</caption>
```
import {execa} from 'execa';

// Similar to `cat < stdin.txt` in Bash
const {stdout} = await execa('cat', {inputFile: 'stdin.txt'});
console.log(stdout);
//=> 'unicorns'
```

@example <caption>Save and pipe output from a child process</caption>
```
import {execa} from 'execa';

const {stdout} = await execa('echo', ['unicorns'], {stdout: ['pipe', 'inherit']});
// Prints `unicorns`
console.log(stdout);
// Also returns 'unicorns'
```

@example <caption>Pipe multiple processes</caption>
```
import {execa} from 'execa';

// Similar to `echo unicorns | cat` in Bash
const {stdout} = await execa('echo', ['unicorns']).pipe(execa('cat'));
console.log(stdout);
//=> 'unicorns'
```

@example <caption>Handling errors</caption>
```
import {execa} from 'execa';

// Catching an error
try {
	await execa('unknown', ['command']);
} catch (error) {
	console.log(error);
	/*
	{
		message: 'Command failed with ENOENT: unknown command spawn unknown ENOENT',
		errno: -2,
		code: 'ENOENT',
		syscall: 'spawn unknown',
		path: 'unknown',
		spawnargs: ['command'],
		originalMessage: 'spawn unknown ENOENT',
		shortMessage: 'Command failed with ENOENT: unknown command spawn unknown ENOENT',
		command: 'unknown command',
		escapedCommand: 'unknown command',
		stdout: '',
		stderr: '',
		failed: true,
		timedOut: false,
		isCanceled: false,
		isTerminated: false,
		cwd: '/path/to/cwd'
	}
	\*\/
}
```
*/
export function execa<OptionsType extends Options = {}>(
	file: string | URL,
	arguments?: readonly string[],
	options?: OptionsType,
): ExecaChildProcess<OptionsType>;
export function execa<OptionsType extends Options = {}>(
	file: string | URL,
	options?: OptionsType,
): ExecaChildProcess<OptionsType>;

/**
Same as `execa()` but synchronous.

Cannot use the following options: `all`, `cleanup`, `buffer`, `detached`, `ipc`, `serialization`, `cancelSignal`, `lines` and `verbose: 'full'`. Also, the `stdin`, `stdout`, `stderr`, `stdio` and `input` options cannot be an array, an iterable, a transform or a web stream. Node.js streams must have a file descriptor unless the `input` option is used.

Returns or throws a `childProcessResult`. The `childProcess` is not returned: its methods and properties are not available. This includes [`.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal), [`.pid`](https://nodejs.org/api/child_process.html#subprocesspid), `.pipe()` and the [`.stdin`/`.stdout`/`.stderr`](https://nodejs.org/api/child_process.html#subprocessstdout) streams.

@param file - The program/script to execute, as a string or file URL
@param arguments - Arguments to pass to `file` on execution.
@returns A `childProcessResult` object
@throws A `childProcessResult` error

@example <caption>Promise interface</caption>
```
import {execa} from 'execa';

const {stdout} = execaSync('echo', ['unicorns']);
console.log(stdout);
//=> 'unicorns'
```

@example <caption>Redirect input from a file</caption>
```
import {execa} from 'execa';

// Similar to `cat < stdin.txt` in Bash
const {stdout} = execaSync('cat', {inputFile: 'stdin.txt'});
console.log(stdout);
//=> 'unicorns'
```

@example <caption>Handling errors</caption>
```
import {execa} from 'execa';

// Catching an error
try {
	execaSync('unknown', ['command']);
} catch (error) {
	console.log(error);
	/*
	{
		message: 'Command failed with ENOENT: unknown command spawnSync unknown ENOENT',
		errno: -2,
		code: 'ENOENT',
		syscall: 'spawnSync unknown',
		path: 'unknown',
		spawnargs: ['command'],
		originalMessage: 'spawnSync unknown ENOENT',
		shortMessage: 'Command failed with ENOENT: unknown command spawnSync unknown ENOENT',
		command: 'unknown command',
		escapedCommand: 'unknown command',
		stdout: '',
		stderr: '',
		failed: true,
		timedOut: false,
		isCanceled: false,
		isTerminated: false,
		cwd: '/path/to/cwd'
	}
	\*\/
}
```
*/
export function execaSync<OptionsType extends SyncOptions = {}>(
	file: string | URL,
	arguments?: readonly string[],
	options?: OptionsType,
): ExecaSyncReturnValue<OptionsType>;
export function execaSync<OptionsType extends SyncOptions = {}>(
	file: string | URL,
	options?: OptionsType,
): ExecaSyncReturnValue<OptionsType>;

/**
Executes a command. The `command` string includes both the `file` and its `arguments`.

Arguments are automatically escaped. They can contain any character, but spaces must be escaped with a backslash like `execaCommand('echo has\\ space')`.

This is the preferred method when executing a user-supplied `command` string, such as in a REPL.

@param command - The program/script to execute and its arguments.
@returns An `ExecaChildProcess` that is both:
- a `Promise` resolving or rejecting with a `childProcessResult`.
- a [`child_process` instance](https://nodejs.org/api/child_process.html#child_process_class_childprocess) with some additional methods and properties.
@throws A `childProcessResult` error

@example
```
import {execaCommand} from 'execa';

const {stdout} = await execaCommand('echo unicorns');
console.log(stdout);
//=> 'unicorns'
```
*/
export function execaCommand<OptionsType extends Options = {}>(
	command: string,
	options?: OptionsType
): ExecaChildProcess<OptionsType>;

/**
Same as `execaCommand()` but synchronous.

Cannot use the following options: `all`, `cleanup`, `buffer`, `detached`, `ipc`, `serialization`, `cancelSignal`, `lines` and `verbose: 'full'`. Also, the `stdin`, `stdout`, `stderr`, `stdio` and `input` options cannot be an array, an iterable, a transform or a web stream. Node.js streams must have a file descriptor unless the `input` option is used.

Returns or throws a `childProcessResult`. The `childProcess` is not returned: its methods and properties are not available. This includes [`.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal), [`.pid`](https://nodejs.org/api/child_process.html#subprocesspid), `.pipe()` and the [`.stdin`/`.stdout`/`.stderr`](https://nodejs.org/api/child_process.html#subprocessstdout) streams.

@param command - The program/script to execute and its arguments.
@returns A `childProcessResult` object
@throws A `childProcessResult` error

@example
```
import {execaCommandSync} from 'execa';

const {stdout} = execaCommandSync('echo unicorns');
console.log(stdout);
//=> 'unicorns'
```
*/
export function execaCommandSync<OptionsType extends SyncOptions = {}>(
	command: string,
	options?: OptionsType
): ExecaSyncReturnValue<OptionsType>;

type TemplateExpression = string | number | ExecaCommonReturnValue
| Array<string | number | ExecaCommonReturnValue>;

type Execa$<OptionsType extends CommonOptions = {}> = {
	/**
	Returns a new instance of `$` but with different default `options`. Consecutive calls are merged to previous ones.

	This can be used to either:
	- Set options for a specific command: `` $(options)`command` ``
	- Share options for multiple commands: `` const $$ = $(options); $$`command`; $$`otherCommand` ``

	@param options - Options to set
	@returns A new instance of `$` with those `options` set

	@example
	```
	import {$} from 'execa';

	const $$ = $({stdio: 'inherit'});

	await $$`echo unicorns`;
	//=> 'unicorns'

	await $$`echo rainbows`;
	//=> 'rainbows'
	```
	*/
	<NewOptionsType extends CommonOptions = {}>
	(options: NewOptionsType): Execa$<OptionsType & NewOptionsType>;

	(templates: TemplateStringsArray, ...expressions: readonly TemplateExpression[]):
	ExecaChildProcess<StricterOptions<OptionsType, Options>> & PipableProcess;

	/**
	Same as $\`command\` but synchronous.

	Cannot use the following options: `all`, `cleanup`, `buffer`, `detached`, `ipc`, `serialization`, `cancelSignal`, `lines` and `verbose: 'full'`. Also, the `stdin`, `stdout`, `stderr`, `stdio` and `input` options cannot be an array, an iterable, a transform or a web stream. Node.js streams must have a file descriptor unless the `input` option is used.

	Returns or throws a `childProcessResult`. The `childProcess` is not returned: its methods and properties are not available. This includes [`.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal), [`.pid`](https://nodejs.org/api/child_process.html#subprocesspid), `.pipe()` and the [`.stdin`/`.stdout`/`.stderr`](https://nodejs.org/api/child_process.html#subprocessstdout) streams.

	@returns A `childProcessResult` object
	@throws A `childProcessResult` error

	@example <caption>Basic</caption>
	```
	import {$} from 'execa';

	const branch = $.sync`git branch --show-current`;
	$.sync`dep deploy --branch=${branch}`;
	```

	@example <caption>Multiple arguments</caption>
	```
	import {$} from 'execa';

	const args = ['unicorns', '&', 'rainbows!'];
	const {stdout} = $.sync`echo ${args}`;
	console.log(stdout);
	//=> 'unicorns & rainbows!'
	```

	@example <caption>With options</caption>
	```
	import {$} from 'execa';

	$.sync({stdio: 'inherit'})`echo unicorns`;
	//=> 'unicorns'
	```

	@example <caption>Shared options</caption>
	```
	import {$} from 'execa';

	const $$ = $({stdio: 'inherit'});

	$$.sync`echo unicorns`;
	//=> 'unicorns'

	$$.sync`echo rainbows`;
	//=> 'rainbows'
	```
	*/
	sync(
		templates: TemplateStringsArray,
		...expressions: readonly TemplateExpression[]
	): ExecaSyncReturnValue<StricterOptions<OptionsType, SyncOptions>>;

	/**
	Same as $\`command\` but synchronous.

	Cannot use the following options: `all`, `cleanup`, `buffer`, `detached`, `ipc`, `serialization`, `cancelSignal`, `lines` and `verbose: 'full'`. Also, the `stdin`, `stdout`, `stderr`, `stdio` and `input` options cannot be an array, an iterable, a transform or a web stream. Node.js streams must have a file descriptor unless the `input` option is used.

	Returns or throws a `childProcessResult`. The `childProcess` is not returned: its methods and properties are not available. This includes [`.kill()`](https://nodejs.org/api/child_process.html#subprocesskillsignal), [`.pid`](https://nodejs.org/api/child_process.html#subprocesspid), `.pipe()` and the [`.stdin`/`.stdout`/`.stderr`](https://nodejs.org/api/child_process.html#subprocessstdout) streams.

	@returns A `childProcessResult` object
	@throws A `childProcessResult` error

	@example <caption>Basic</caption>
	```
	import {$} from 'execa';

	const branch = $.s`git branch --show-current`;
	$.s`dep deploy --branch=${branch}`;
	```

	@example <caption>Multiple arguments</caption>
	```
	import {$} from 'execa';

	const args = ['unicorns', '&', 'rainbows!'];
	const {stdout} = $.s`echo ${args}`;
	console.log(stdout);
	//=> 'unicorns & rainbows!'
	```

	@example <caption>With options</caption>
	```
	import {$} from 'execa';

	$.s({stdio: 'inherit'})`echo unicorns`;
	//=> 'unicorns'
	```

	@example <caption>Shared options</caption>
	```
	import {$} from 'execa';

	const $$ = $({stdio: 'inherit'});

	$$.s`echo unicorns`;
	//=> 'unicorns'

	$$.s`echo rainbows`;
	//=> 'rainbows'
	```
	*/
	s(
		templates: TemplateStringsArray,
		...expressions: readonly TemplateExpression[]
	): ExecaSyncReturnValue<StricterOptions<OptionsType, SyncOptions>>;
};

/**
Executes a command. The `command` string includes both the `file` and its `arguments`.

Arguments are automatically escaped. They can contain any character, but spaces, tabs and newlines must use `${}` like `` $`echo ${'has space'}` ``.

This is the preferred method when executing multiple commands in a script file.

The `command` string can inject any `${value}` with the following types: string, number, `childProcess` or an array of those types. For example: `` $`echo one ${'two'} ${3} ${['four', 'five']}` ``. For `${childProcess}`, the process's `stdout` is used.

@returns An `ExecaChildProcess` that is both:
	- a `Promise` resolving or rejecting with a `childProcessResult`.
	- a [`child_process` instance](https://nodejs.org/api/child_process.html#child_process_class_childprocess) with some additional methods and properties.
@throws A `childProcessResult` error

@example <caption>Basic</caption>
```
import {$} from 'execa';

const branch = await $`git branch --show-current`;
await $`dep deploy --branch=${branch}`;
```

@example <caption>Multiple arguments</caption>
```
import {$} from 'execa';

const args = ['unicorns', '&', 'rainbows!'];
const {stdout} = await $`echo ${args}`;
console.log(stdout);
//=> 'unicorns & rainbows!'
```

@example <caption>With options</caption>
```
import {$} from 'execa';

await $({stdio: 'inherit'})`echo unicorns`;
//=> 'unicorns'
```

@example <caption>Shared options</caption>
```
import {$} from 'execa';

const $$ = $({stdio: 'inherit'});

await $$`echo unicorns`;
//=> 'unicorns'

await $$`echo rainbows`;
//=> 'rainbows'
```
*/
export const $: Execa$;

/**
Same as `execa()` but using the `node` option.

Executes a Node.js file using `node scriptPath ...arguments`.

This is the preferred method when executing Node.js files.

@param scriptPath - Node.js script to execute, as a string or file URL
@param arguments - Arguments to pass to `scriptPath` on execution.
@returns An `ExecaChildProcess` that is both:
- a `Promise` resolving or rejecting with a `childProcessResult`.
- a [`child_process` instance](https://nodejs.org/api/child_process.html#child_process_class_childprocess) with some additional methods and properties.
@throws A `childProcessResult` error

@example
```
import {execa} from 'execa';

await execaNode('scriptPath', ['argument']);
```
*/
export function execaNode<OptionsType extends Options = {}>(
	scriptPath: string | URL,
	arguments?: readonly string[],
	options?: OptionsType
): ExecaChildProcess<OptionsType>;
export function execaNode<OptionsType extends Options = {}>(
	scriptPath: string | URL,
	options?: OptionsType
): ExecaChildProcess<OptionsType>;
