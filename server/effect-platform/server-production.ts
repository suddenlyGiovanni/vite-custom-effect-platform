import { createServer } from 'node:http'
import {
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer, flow } from 'effect'
import { HttpStaticMiddleware } from './http-static-middleware.ts'

import { ConfigService } from './config-service.ts'
import { ViteDevServerService } from './vite-service.ts'

const ServerLive = NodeHttpServer.layerConfig(createServer, {
	port: Config.number('PORT').pipe(Config.withDefault(3000)),
})

const HttpLive = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const module = yield* Effect.promise(
				() =>
					// @ts-ignore
					import('../../build/server/index.js') as Promise<
						typeof import('./handler.ts')
					>,
			)
			return yield* module.handler
		}).pipe(HttpStaticMiddleware),
	),

	Effect.catchTags({
		RouteNotFound: () =>
			HttpServerResponse.text('Route Not Found', { status: 404 }),
	}),

	Effect.catchAllCause((cause) =>
		HttpServerResponse.text(cause.toString(), { status: 500 }),
	),

	HttpServer.serve(
		flow(HttpMiddleware.xForwardedHeaders, HttpMiddleware.logger),
	),
	HttpServer.withLogAddress,
	Layer.provide(ViteDevServerService.Default),
	Layer.provide(ServerLive),
	Layer.provide(ConfigService.Default),
)

NodeRuntime.runMain(Layer.launch(HttpLive))
