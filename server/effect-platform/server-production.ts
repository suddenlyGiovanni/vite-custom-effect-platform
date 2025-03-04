import { createServer } from 'node:http'
import {
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Console, Effect, Layer, flow } from 'effect'

import { ConfigService } from './config-service.ts'
import { HttpStaticMiddleware } from './http-static-middleware.ts'
import { ViteDevServerService } from './vite-service.ts'

const ServerLive = NodeHttpServer.layerConfig(createServer, {
	port: Config.number('PORT').pipe(Config.withDefault(3000)),
})

const HttpLive = HttpRouter.empty.pipe(
	HttpRouter.use(HttpStaticMiddleware),
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const module = yield* Effect.promise(
				() =>
					// @ts-expect-error - This is a dynamic import of build stuff
					import('../../build/server/index.js') as Promise<
						typeof import('./handler.ts')
					>,
			)
			return yield* module.handler
		}),
	),

	Effect.catchTags({
		RouteNotFound: (_) =>
			Effect.gen(function* () {
				yield* Console.error('Route Not Found', _)
				return yield* HttpServerResponse.text('Route Not Found', {
					status: 404,
				})
			}),
	}),

	Effect.catchAllCause((cause) =>
		Effect.gen(function* () {
			yield* Console.error(cause)
			return yield* HttpServerResponse.text(cause.toString(), { status: 500 })
		}),
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
