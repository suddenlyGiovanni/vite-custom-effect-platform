import { createServer } from 'node:http'
import {
	HttpMiddleware,
	HttpServer,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Console, Effect, Layer, flow } from 'effect'

import { Development } from './router/development.ts'
import { Production } from './router/production.ts'
import { ConfigService, ViteDevServerService } from './services/index.ts'

const ServerLive = NodeHttpServer.layerConfig(createServer, {
	port: Config.number('PORT').pipe(Config.withDefault(3000)),
})

const HttpLive = Effect.gen(function* () {
	const { NODE_ENV } = yield* ConfigService
	return NODE_ENV === 'production'
		? yield* Production //
		: yield* Development
}).pipe(
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
