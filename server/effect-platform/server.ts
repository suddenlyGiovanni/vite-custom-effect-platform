import { createServer } from 'node:http'
import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer, flow, pipe } from 'effect'

import { viteMiddleware } from './vite-middleware.ts'
import { ViteDevServerService, ViteServiceSingleton } from './vite-service.ts'

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const viteDevServer = yield* ViteDevServerService

			const { handler } = yield* Effect.promise(
				() =>
					viteDevServer.ssrLoadModule(
						'./server/effect-platform/handler.ts',
					) as Promise<typeof import('./handler.ts')>,
			)

			return yield* handler
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

const AppConfigLive = Layer.merge(
	NodeHttpServer.layer(() => createServer(), { port: 3000 }),
	Layer.effect(
		ViteDevServerService,
		ViteServiceSingleton.getInstanceEffectually().pipe(
			Effect.map((_) => _.viteDevServer),
		),
	),
)

NodeRuntime.runMain(
	Layer.launch(
		Layer.provide(
			app,
			// Create a server layer with the specified port
			AppConfigLive,
		),
	),
)
