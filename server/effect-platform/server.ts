import { createServer } from 'node:http'
import {
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerRequest,
} from '@effect/platform'
import {
	NodeHttpServer,
	NodeHttpServerRequest,
	NodeRuntime,
} from '@effect/platform-node'
import { Config, Effect, Layer, flow, pipe } from 'effect'

import { createHttpHandler } from './adapters/create-http-handler.ts'
import { viteMiddleware } from './vite-middleware.ts'

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
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
		}).pipe(viteMiddleware),
	),
)

// Set up the application server with logging
const app = pipe(
	router,
	HttpServer.serve(
		flow(HttpMiddleware.xForwardedHeaders, HttpMiddleware.logger),
	),
	HttpServer.withLogAddress,
)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))
