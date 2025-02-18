import type { Readable, Writable } from 'node:stream'
import { Stream } from 'node:stream'

export async function writeReadableStreamToWritable(
	stream: ReadableStream,
	writable: Writable,
) {
	const reader = stream.getReader()
	const flushable = writable as Writable & {
		flush?: (...args: unknown[]) => unknown
	}

	try {
		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				writable.end()
				break
			}

			writable.write(value)
			if (typeof flushable.flush === 'function') {
				flushable.flush()
			}
		}
	} catch (error: unknown) {
		writable.destroy(error instanceof Error ? error : new Error(String(error)))
		throw error
	}
}

export async function writeAsyncIterableToWritable(
	iterable: AsyncIterable<Uint8Array>,
	writable: Writable,
) {
	try {
		for await (const chunk of iterable) {
			writable.write(chunk)
		}
		writable.end()
	} catch (error: unknown) {
		writable.destroy(error instanceof Error ? error : new Error(String(error)))
		throw error
	}
}

export async function readableStreamToString(
	stream: ReadableStream<Uint8Array>,
	encoding?: BufferEncoding,
) {
	const reader = stream.getReader()
	const chunks: Uint8Array[] = []

	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}
		if (value) {
			chunks.push(value)
		}
	}

	return Buffer.concat(chunks).toString(encoding)
}

export const createReadableStreamFromReadable = (
	source: Readable & { readableHighWaterMark?: number },
) => {
	const pump = new StreamPump(source)

	const stream = new ReadableStream(pump, pump)
	return stream
}

class StreamPump {
	public accumulatedSize: number
	public highWaterMark: number
	private controller?: ReadableStreamController<Uint8Array>
	private stream: Stream & {
		readableHighWaterMark?: number
		readable?: boolean
		resume?: () => void
		pause?: () => void
		destroy?: (error?: Error) => void
	}

	constructor(
		stream: Stream & {
			readableHighWaterMark?: number
			readable?: boolean
			resume?: () => void
			pause?: () => void
			destroy?: (error?: Error) => void
		},
	) {
		this.highWaterMark =
			stream.readableHighWaterMark ||
			new Stream.Readable().readableHighWaterMark
		this.accumulatedSize = 0
		this.stream = stream
		this.enqueue = this.enqueue.bind(this)
		this.error = this.error.bind(this)
		this.close = this.close.bind(this)
	}

	cancel(reason?: Error) {
		if (this.stream.destroy) {
			this.stream.destroy(reason)
		}

		this.stream.off('data', this.enqueue)
		this.stream.off('error', this.error)
		this.stream.off('end', this.close)
		this.stream.off('close', this.close)
	}

	close() {
		if (this.controller) {
			this.controller.close()
			// biome-ignore lint/performance/noDelete: <explanation>
			delete this.controller
		}
	}

	enqueue(chunk: Uint8Array | string) {
		if (this.controller) {
			try {
				const bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk)

				const available = (this.controller.desiredSize || 0) - bytes.byteLength
				this.controller.enqueue(bytes)
				if (available <= 0) {
					this.pause()
				}
			} catch (error: unknown) {
				this.controller.error(
					new Error(
						'Could not create Buffer, chunk must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object',
					),
				)
				this.cancel()
			}
		}
	}

	error(error: Error) {
		if (this.controller) {
			this.controller.error(error)
			// biome-ignore lint/performance/noDelete: <explanation>
			delete this.controller
		}
	}

	pause() {
		if (this.stream.pause) {
			this.stream.pause()
		}
	}

	pull() {
		this.resume()
	}

	resume() {
		if (this.stream.readable && this.stream.resume) {
			this.stream.resume()
		}
	}

	size(chunk: Uint8Array) {
		return chunk?.byteLength || 0
	}

	start(controller: ReadableStreamController<Uint8Array>) {
		this.controller = controller
		this.stream.on('data', this.enqueue)
		this.stream.once('error', this.error)
		this.stream.once('end', this.close)
		this.stream.once('close', this.close)
	}
}
