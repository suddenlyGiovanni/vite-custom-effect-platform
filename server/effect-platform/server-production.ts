import { createServer } from 'node:http'
import {
	FileSystem,
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Layer, Schema, flow } from 'effect'

import { ViteDevServerService } from './vite-service.ts'

const AssetsSchemaParams = Schema.Struct({
	assetName: Schema.String.annotations({
		description: 'The file name of the asset to serve',
		examples: ['index.html', 'tailwind-BheVJGT0.css'],
	}),
})

const oneMinute = 60
const oneHour = 60 * oneMinute
const oneDay = 24 * oneHour
const oneYear = 365 * oneDay

const ServerLive = NodeHttpServer.layerConfig(createServer, {
	port: Config.number('PORT').pipe(Config.withDefault(3000)),
})

const HttpLive = HttpRouter.empty.pipe(
	HttpRouter.get(
		'/',
		Effect.gen(function* () {
			const { handler } = yield* Effect.promise(
				() =>
					import('../../build/server/index.js') as Promise<
						typeof import('./handler.ts')
					>,
			)
			return yield* handler
		}),
	),
	HttpRouter.get(
		'/assets/:assetName',
		Effect.gen(function* () {
			const params = yield* HttpRouter.schemaParams(AssetsSchemaParams)
			const fs = yield* FileSystem.FileSystem
			const filePath = `build/client/assets/${params.assetName}`
			if (yield* fs.exists(filePath)) {
				const serverResponse = yield* HttpServerResponse.file(filePath)

				return yield* serverResponse.pipe(
					HttpServerResponse.setHeader(
						'Cache-Control',
						`public, max-age=${oneYear}, immutable`,
					),
				)
			}
			return yield* HttpServerResponse.empty({ status: 404 })
		}),
	),

	HttpRouter.get(
		'/:assetName',
		Effect.gen(function* () {
			const params = yield* HttpRouter.schemaParams(AssetsSchemaParams)
			const fs = yield* FileSystem.FileSystem
			const filePath = `build/client/${params.assetName}`
			if (yield* fs.exists(filePath)) {
				const serverResponse = yield* HttpServerResponse.file(filePath)

				return yield* serverResponse.pipe(
					HttpServerResponse.setHeader('Cache-Control', `max-age=${oneHour}`),
				)
			}
			return yield* HttpServerResponse.empty({ status: 404 })
		}),
	),

	HttpServer.serve(
		flow(HttpMiddleware.xForwardedHeaders, HttpMiddleware.logger),
	),
	HttpServer.withLogAddress,
	Layer.provide(ViteDevServerService.Default),
	Layer.provide(ServerLive),
)

NodeRuntime.runMain(Layer.launch(HttpLive))
