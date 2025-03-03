import {
	FileSystem,
	HttpMiddleware,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import { Console, Effect, Option, Schema } from 'effect'

const oneMinute = 60
const oneHour = 60 * oneMinute
const oneDay = 24 * oneHour
const oneYear = 365 * oneDay

export const HttpStaticMiddleware = HttpMiddleware.make((app) =>
	Effect.gen(function* () {
		const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
		const fs = yield* FileSystem.FileSystem
		if (httpServerRequest.method === 'GET') {
			const { url } = httpServerRequest
			let maybeResource: Option.Option<string>
			// remove the leading slash then
			if (url.startsWith('/assets/')) {
				const assetMatch = /^\/assets\/([^\/]+\.[^\/]+)$/.exec(url)
				maybeResource = Option.fromNullable(assetMatch?.[1]).pipe(
					Option.map((fileName) => `build/client/assets/${fileName}`),
				)
			} else if (url.startsWith('/__manifest')) {
				// if includes '__manifest'
				// e.g. '/__manifest?p=%2F&p=%2Fabout&p=%2Fcontacts%2Falex-anderson&p=%2Fcontacts%2Falexandra-spalato&p=%2Fcontacts%2Fandre-landgraf&p=%2Fcontacts%2Fandrew-petersen&p=%2Fcontacts%2Farisa-fukuzaki&p=%2Fcontacts%2Fashley-narcisse&p=%2Fcontacts%2Fbrandon-kish&p=%2Fcontacts%2Fbrian-lee&p=%2Fcontacts%2Fbrooks-lybrand&p=%2Fcontacts%2Fcameron-matheson&p=%2Fcontacts%2Fcat-johnson&p=%2Fcontacts%2Fchristopher-chedeau&p=%2Fcontacts%2Fclifford-fajardo&p=%2Fcontacts%2Fedmund-hung&p=%2Fcontacts%2Ferick-tamayo&p=%2Fcontacts%2Fgiovanni-benussi&p=%2Fcontacts%2Fglenn-reyes&p=%2Fcontacts%2Figor-minar&p=%2Fcontacts%2Fjon-jensen&p=%2Fcontacts%2Fkent_c.-dodds&p=%2Fcontacts%2Fmichael-jackson&p=%2Fcontacts%2Fmonica-powell&p=%2Fcontacts%2Fnevi-shah&p=%2Fcontacts%2Foscar-newman&p=%2Fcontacts%2Fpaul-bratslavsky&p=%2Fcontacts%2Fpedro-cattori&p=%2Fcontacts%2Fryan-florence&p=%2Fcontacts%2Fscott-smerchek&p=%2Fcontacts%2Fsean-mcquaid&p=%2Fcontacts%2Fshane-walker&p=%2Fcontacts%2Fshruti-kapoor&version=aac2b4b8'
				// then the assets to retunr should be manifest-${SerchParams.version}.js
				const searchParams = yield* HttpServerRequest.schemaSearchParams(
					Schema.Struct({ version: Schema.String }),
				)

				// FIXME: should operate on the assumption that schema params are missing, hence return Option.none
				maybeResource = Option.some(
					`build/client/assets/manifest-${searchParams.version}.js`,
				)
			} else {
				const directFileMatch = /^\/([^\/]+\.[^\/]+)$/.exec(url)

				maybeResource = Option.fromNullable(directFileMatch?.[1]).pipe(
					Option.map((fileName) => `build/client/${fileName}`),
				)
			}
			// if includes 'assets/<stuff>'
			// of includes '__manifest'
			// or includes '<stuff>'
			// if _resource is some then happy path.

			if (Option.isSome(maybeResource)) {
				const resource = Option.getOrThrow(maybeResource)
				yield* Console.log(resource)

				if (yield* fs.exists(resource)) {
					const serverResponse = yield* HttpServerResponse.file(resource)

					return yield* serverResponse.pipe(
						HttpServerResponse.setHeader(
							'Cache-Control',
							`public, max-age=${oneYear}, immutable`,
						),
					)
				}
			}
		}
		return yield* app
	}),
)
