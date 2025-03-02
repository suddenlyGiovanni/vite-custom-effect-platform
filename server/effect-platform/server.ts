import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'

import { Effect, flow, pipe } from 'effect'
import { listen } from './listen.ts'
import { viteMiddleware } from './vite-middleware.ts'
import { ViteServiceSingleton } from './vite-service.ts'

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const { viteDevServer } =
				yield* ViteServiceSingleton.getInstanceEffectually()

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

listen(app, 3000)
