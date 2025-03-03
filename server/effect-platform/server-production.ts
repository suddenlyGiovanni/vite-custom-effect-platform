import { createServer } from 'node:http'
import {
	FileSystem,
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
	Url,
	UrlParams,
} from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Config, Console, Effect, Layer, Option, Schema, flow } from 'effect'

import { ConfigService } from './config-service.ts'
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

const handler = Effect.gen(function* () {
	const module = yield* Effect.promise(
		() =>
			import('../../build/server/index.js') as Promise<
				typeof import('./handler.ts')
			>,
	)
	return yield* module.handler
})

const HttpLive = HttpRouter.empty.pipe(
	// HttpRouter.get(
	// 	'/assets/:assetName',
	// 	Effect.gen(function* () {
	// 		const params = yield* HttpRouter.schemaParams(AssetsSchemaParams)
	// 		const fs = yield* FileSystem.FileSystem
	// 		const filePath = `build/client/assets/${params.assetName}`
	// 		if (yield* fs.exists(filePath)) {
	// 			const serverResponse = yield* HttpServerResponse.file(filePath)
	//
	// 			return yield* serverResponse.pipe(
	// 				HttpServerResponse.setHeader(
	// 					'Cache-Control',
	// 					`public, max-age=${oneYear}, immutable`,
	// 				),
	// 			)
	// 		}
	// 		return yield* HttpServerResponse.empty({ status: 404 })
	// 	}),
	// ),

	// HttpRouter.get(
	// 	'/__manifest',
	// 	Effect.gen(function* () {
	// 		const fs = yield* FileSystem.FileSystem
	// 		const { version } = yield* HttpServerRequest.schemaSearchParams(
	// 			Schema.Struct({ version: Schema.String }),
	// 		)
	// 		const filePath = `build/client/assets/manifest-${version}.js`
	// 		if (yield* fs.exists(filePath)) {
	// 			const serverResponse = yield* HttpServerResponse.file(filePath)
	// 			return yield* serverResponse.pipe(
	// 				HttpServerResponse.setHeader(
	// 					'Cache-Control',
	// 					`max-age=${oneYear}, immutable`,
	// 				),
	// 			)
	// 		}
	// 		return yield* HttpServerResponse.empty({ status: 404 })
	// 	}),
	// ),

	// HttpRouter.get(
	// 	'/:assetName',
	// 	Effect.gen(function* () {
	// 		const params = yield* HttpRouter.schemaParams(AssetsSchemaParams)
	// 		const fs = yield* FileSystem.FileSystem
	// 		const filePath = `build/client/${params.assetName}`
	// 		if (yield* fs.exists(filePath)) {
	// 			const serverResponse = yield* HttpServerResponse.file(filePath)
	// 			return yield* serverResponse.pipe(
	// 				HttpServerResponse.setHeader('Cache-Control', `max-age=${oneHour}`),
	// 			)
	// 		}
	// 		return yield* HttpServerResponse.empty({ status: 404 })
	// 	}),
	// ),

	HttpRouter.all(
		'*',
		handler.pipe(
			HttpMiddleware.make((app) =>
				Effect.gen(function* () {
					const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
					const fs = yield* FileSystem.FileSystem
					if (httpServerRequest.method === 'GET') {
						const maybeResource = extractFileResource(httpServerRequest.url)
						if (Option.isSome(maybeResource)) {
							const resource = Option.getOrThrow(maybeResource)
							yield* Console.log(resource)

							const basePath = httpServerRequest.url.includes('/assets/')
								? 'build/client/assets/'
								: 'build/client/'

							const filePath = `${basePath}${resource}`

							if (yield* fs.exists(filePath)) {
								const serverResponse = yield* HttpServerResponse.file(filePath)

								return yield* serverResponse.pipe(
									HttpServerResponse.setHeader(
										'Cache-Control',
										`public, max-age=${oneYear}, immutable`,
									),
								)
							}
						}

						// do stuff...
						// check the url if it stars with /assets or /__manifest
						// if it does return the assets from the build/client/assets folder
					}
					return yield* app
				}),
			),
		),
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

function extractFileResource(url: string): Option.Option<string> {
	// For direct file requests like /favicon.ico
	const directFileMatch = /^\/([^\/]+\.[^\/]+)$/.exec(url)
	if (directFileMatch) {
		return Option.fromNullable(directFileMatch[1])
	}
	// For asset requests like /assets/image.jpg
	const assetMatch = /^\/assets\/([^\/]+\.[^\/]+)$/.exec(url)
	if (assetMatch) {
		return Option.fromNullable(assetMatch[1])
	}

	if (url.startsWith('/__manifest')) {
		// should return the full path omitting the '/'
		// for example __manifest-1.0.0.js
		return Option.some(url.substring(1))
	}

	return Option.none()
}
