import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http'

import {
	HttpMiddleware,
	HttpRouter,
	Headers,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import {
	NodeHttpServer,
	NodeHttpServerRequest,
	NodeRuntime,
} from '@effect/platform-node'
import { Data, Effect, Layer, Stream, pipe } from 'effect'
import * as ReactRouter from 'react-router'

import { createRemixRequest } from './create-remix-request.ts'

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
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
				// need to convert the response.body, which is a ReadableStream<Uint8Array>, into a Stream.Stream<Uint8Array, E, never>
				return yield* HttpServerResponse.stream(
					Stream.fromReadableStream(
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						() => response.body!,
						(error) =>
							new Error(`Error reading response stream: ${String(error)}`),
					),
					options,
				)
			}

			return yield* HttpServerResponse.empty(options)
		}).pipe(
			HttpMiddleware.make((app) => {
				return Effect.gen(function* () {
					const viteDevServer = yield* Effect.promise(() =>
						import('vite').then((vite) =>
							vite.createServer({ server: { middlewareMode: true } }),
						),
					)
					// we need to call the viteDevServer.middleware to hand off the request to Vite,
					// there are some issues:
					// 1. viteDevServer.middleware is expecting an connect/express request/response object
					// 2. viteDevServer.middleware is also expecting a next callback function to be passed to it used for error handling and to signal that the request has been handled
					// 3. once we call viteDevServer.middleware, it will handle the request, also terminating the request handling in the current function and we won't be able to do anything else with the request in
					const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
					const incomingMessage =
						NodeHttpServerRequest.toIncomingMessage(httpServerRequest)
					const serverResponse =
						NodeHttpServerRequest.toServerResponse(httpServerRequest)

					return yield* Effect.async<
						Effect.Effect.Success<typeof app>,
						Effect.Effect.Error<typeof app> | MiddlewareError,
						Effect.Effect.Context<typeof app>
					>((resume) => {
						const listener = (): void => {
							console.log('listener')
							resume(
								Effect.succeed(
									HttpServerResponse.raw(null, {
										status: serverResponse.statusCode,
										statusText: serverResponse.statusMessage,
									}),
								),
							)
						}

						serverResponse.once('close', () => {
							console.log('close')
							listener()
						})

						viteDevServer.middlewares(
							incomingMessage,
							serverResponse,
							(err?: unknown): void => {
								if (err) {
									console.log(err)
									resume(
										Effect.fail(new MiddlewareError({ message: String(err) })),
									)
								} else {
									serverResponse.off('finish', () => {
										console.log('finish')
										listener()
									})
									resume(app)
								}
							},
						)
					})
				})
			}),
		),
	),
)

class MiddlewareError extends Data.TaggedError('MiddlewareError')<{
	message: string
}> {}

// Set up the application server with logging
const app = pipe(
	router,
	HttpServer.serve(HttpMiddleware.logger),
	HttpServer.withLogAddress,
)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))
