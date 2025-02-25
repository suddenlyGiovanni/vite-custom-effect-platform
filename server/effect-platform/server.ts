import { createServer } from 'node:http'
import {
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import {
	NodeHttpServer,
	NodeHttpServerRequest,
	NodeRuntime,
} from '@effect/platform-node'
import { Data, Effect, Layer, pipe } from 'effect'

// Middleware constructor that logs the name of the middleware
const withMiddleware = (name: string) =>
	HttpMiddleware.make((app) =>
		Effect.gen(function* () {
			console.log(name) // Log the middleware name when the route is accessed
			return yield* app // Continue with the original application flow
		}),
	)

// const viteDevServer = await import('vite').then((vite) =>
// 	vite.createServer({ server: { middlewareMode: true } }),
// )

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.map(
			HttpServerRequest.HttpServerRequest, //
			(req) => HttpServerResponse.text(req.url),
		).pipe(
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
