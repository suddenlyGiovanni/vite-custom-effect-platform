import { createServer } from 'node:http'
import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer, flow } from 'effect'

import { ConfigService } from './config-service.ts'
import { viteMiddleware } from './vite-middleware.ts'
import { ViteDevServerService } from './vite-service.ts'

const ServerLive = NodeHttpServer.layerConfig(createServer, {
	port: Config.number('PORT').pipe(Config.withDefault(3000)),
})

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
		}),
	),

	HttpRouter.use(viteMiddleware),

	HttpServer.serve(
		flow(HttpMiddleware.xForwardedHeaders, HttpMiddleware.logger),
	),
	HttpServer.withLogAddress,
	Layer.provide(ViteDevServerService.Default),
	Layer.provide(ServerLive),
	Layer.provide(ConfigService.Default),
)

NodeRuntime.runMain(Layer.launch(HttpLive))
