import { HttpServerRequest } from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Config, Effect } from 'effect'

import { createHttpHandler } from 'server/effect-platform/create-http-handler.ts'

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

	const handler = createHttpHandler({
		// @ts-expect-error
		build: () => import('virtual:react-router/server-build'),
		getLoadContext: () => ({ VALUE_FROM_EXPRESS: 'Hello from Express' }),
		mode: yield* Config.string('NODE_ENV'),
	})

	return yield* handler(
		NodeHttpServerRequest.toIncomingMessage(httpServerRequest),
		NodeHttpServerRequest.toServerResponse(httpServerRequest),
	)
})
