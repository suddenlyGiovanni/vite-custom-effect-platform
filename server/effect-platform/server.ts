import { createServer } from 'node:http'
import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer, flow } from 'effect'

import { viteMiddleware } from './vite-middleware.ts'
import { ViteDevServerService } from './vite-service.ts'

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

const HttpLive = HttpRouter.empty.pipe(
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
	HttpServer.serve(
		flow(HttpMiddleware.xForwardedHeaders, HttpMiddleware.logger),
	),
	HttpServer.withLogAddress,
	Layer.provide(ViteDevServerService.Default),
	Layer.provide(ServerLive),
)

NodeRuntime.runMain(Layer.launch(HttpLive))
