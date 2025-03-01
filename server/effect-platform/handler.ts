import type { IncomingMessage, ServerResponse } from 'node:http'
import {
	Headers,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Effect, Stream } from 'effect'
import * as ReactRouter from 'react-router'

import { createRemixRequest } from './create-remix-request.ts'

/**
 * A generator-based `handler` function utilizing effects to process HTTP server requests
 * and responses. This handler integrates with Node.js HTTP server, processes the incoming
 * requests, applies routing logic using the React Router, and formulates HTTP server responses.
 *
 * The function leverages an effect system for handling asynchronous operations through
 * generators. It captures incoming HTTP requests, translates them into a format compatible
 * with the Remix framework for further processing, and constructs responses accordingly.
 *
 * Key responsibilities:
 * 1. Retrieves and formats the incoming HTTP request for compatibility with React Router's Request handler.
 * 2. Invokes a Remix-compatible request handler function to process the request and generate a response.
 * 3. Manages response headers, including streaming responses for content such as Server-Sent Events.
 * 4. Converts response bodies (readable streams) to an appropriate format compatible with the effect system.
 *
 * The final HTTP response is crafted with the appropriate status, headers, and body based
 * on the processing outcome.
 *
 * Notes:
 * - Supports streaming responses when the `Content-Type` indicates a text event stream.
 * - Error handling is applied to readable stream conversions.
 * - This function assumes environmental configuration for `NODE_ENV` and appropriate handling
 *   of dynamic imports for React Router server builds.
 */
export const handler = Effect.gen(function* () {
	const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
	const incomingMessage =
		NodeHttpServerRequest.toIncomingMessage(httpServerRequest)
	const serverResponse: ServerResponse<IncomingMessage> =
		NodeHttpServerRequest.toServerResponse(httpServerRequest)

	// (request: Request, loadContext?: AppLoadContext$1) => Promise<Response>;
	const handleRequest = ReactRouter.createRequestHandler(
		// @ts-expect-error
		() => import('virtual:react-router/server-build'),
		process.env['NODE_ENV'],
	)

	const request = createRemixRequest(incomingMessage, serverResponse)
	const response = yield* Effect.promise(() => handleRequest(request))

	if (response.headers.get('Content-Type')?.match(/text\/event-stream/i)) {
		serverResponse.flushHeaders()
	}

	const options: HttpServerResponse.Options = {
		status: response.status,
		statusText: response.statusText,
		headers: Headers.fromInput(response.headers),
	}

	if (response.body) {
		return yield* HttpServerResponse.stream(
			Stream.fromReadableStream(
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				() => response.body!,
				(error) => new Error(`Error reading response stream: ${String(error)}`),
			),
			options,
		)
	}

	return yield* HttpServerResponse.empty(options)
})
