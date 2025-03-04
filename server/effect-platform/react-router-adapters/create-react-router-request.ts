import type {
	IncomingHttpHeaders,
	IncomingMessage,
	ServerResponse,
} from 'node:http'
import * as ReactRouterNode from '../../react-router-node/index.ts'

/**
 * Converts incoming HTTP headers into a `Headers` object suitable for usage in a web environment.
 *
 * @param incomingHeaders - The original HTTP headers object, typically sourced from a request.
 * @return A new `Headers` object containing the converted header entries.
 */
function createRemixHeaders(incomingHeaders: IncomingHttpHeaders): Headers {
	const headers = new Headers()

	for (const [key, values] of Object.entries(incomingHeaders)) {
		if (values) {
			if (Array.isArray(values)) {
				for (const value of values) {
					headers.append(key, value)
				}
			} else {
				headers.set(key, values)
			}
		}
	}

	return headers
}

/**
 * Creates a new Remix Request object based on the given Node incomingMessage and serverResponse.
 *
 * This method resolves the full URL of the incoming request using information from the Express request object,
 * including the protocol, hostname, port, and original URL.
 * It also sets up an `AbortController` to abort Remix actions or loaders if the response is no longer writable (e.g., when the client connection is closed or the response is finished). Additionally, it correctly handles request methods other than `GET` and `HEAD` by creating a readable stream for the request body.
 *
 * @return Returns a Remix `Request` object that represents the HTTP request in a format compatible with the Remix framework.
 * @param incomingMessage
 * @param serverResponse
 */
export function createReactRouterRequest(
	incomingMessage: IncomingMessage,
	serverResponse: ServerResponse<IncomingMessage>,
): Request {
	// Extract protocol
	const xForwardedProto = incomingMessage.headersDistinct[
		'x-forwarded-proto'
	]?.[0] as undefined | 'http' | 'https'
	const protocol =
		xForwardedProto ||
		(incomingMessage.socket &&
			'encrypted' in incomingMessage.socket &&
			incomingMessage.socket.encrypted)
			? 'https'
			: 'http'

	// Extract hostname and port from headers
	const xForwardedHost =
		incomingMessage.headersDistinct['x-forwarded-host']?.[0]
	const hostHeader = (xForwardedHost || incomingMessage.headers.host) ?? ''

	// Split hostname and port
	const [hostname, hostPort = ''] = hostHeader.split(':')

	/**
	 * Use req.hostname here as it respects the "trust proxy" setting
	 */
	const resolvedHost = `${hostname}${hostPort ? `:${hostPort}` : ''}`
	/**
	 * Use `req.originalUrl` so Remix is aware of the full path
	 */
	const url = new URL(
		`${protocol}://${resolvedHost}${incomingMessage.url ?? ''}`,
	)

	/**
	 * Abort action/loaders once we can no longer write a response
	 */
	let controller: null | AbortController = new AbortController()
	const init: RequestInit = {
		method: incomingMessage.method,
		headers: createRemixHeaders(incomingMessage.headers),
		signal: controller.signal,
	}

	/**
	 * Abort action/loaders once we can no longer write a response iff we have
	 * not yet sent a response (i.e., `close` without `finish`)
	 * `finish` -> done rendering the response
	 * `close` -> response can no longer be written to
	 */
	serverResponse.on('finish', () => {
		controller = null
	})
	serverResponse.on('close', () => controller?.abort())

	if (incomingMessage.method !== 'GET' && incomingMessage.method !== 'HEAD') {
		init.body =
			ReactRouterNode.createReadableStreamFromReadable(incomingMessage)
		;(init as { duplex: 'half' }).duplex = 'half'
	}

	return new Request(url.href, init)
}
