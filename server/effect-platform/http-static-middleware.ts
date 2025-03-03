import {
	FileSystem,
	HttpMiddleware,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import { Console, Effect, Option } from 'effect'

const oneMinute = 60
const oneHour = 60 * oneMinute
const oneDay = 24 * oneHour
const oneYear = 365 * oneDay

const assetsPathRegex = /^\/assets\/([^\/]+\.[^\/]+)$/
const fileNameRegex = /^\/([^\/]+\.[^\/]+)$/

export const HttpStaticMiddleware = HttpMiddleware.make((app) =>
	Effect.gen(function* () {
		const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
		const fs = yield* FileSystem.FileSystem
		if (httpServerRequest.method === 'GET') {
			const { url } = httpServerRequest
			let maybeResource: Option.Option<string>
			const assetsMatch = assetsPathRegex.exec(url)

			/** if includes '/assets/<fileName>.<fileExtension>' */
			if (assetsMatch) {
				maybeResource = Option.fromNullable(assetsMatch?.[1]).pipe(
					Option.map((fileName) => `build/client/assets/${fileName}`),
				)
				/** if includes '/__manifest?<searchParams>' */
			} else if (url.startsWith('/__manifest')) {
				maybeResource = Option.fromNullable(
					new URL(url, 'http://localhost').searchParams.get('version'),
				).pipe(
					Option.map((version) => `build/client/assets/manifest-${version}.js`),
				)
			} else {
				/** or if includes '/<fileName>.<fileExtension>' */
				maybeResource = Option.fromNullable(fileNameRegex.exec(url)?.[1]).pipe(
					Option.map((fileName) => `build/client/${fileName}`),
				)
			}

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

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest

	describe('/assets/<fileName>.<fileType>', () => {
		const assetsResources = [
			['/assets/about-KhV7b0eh.js', 'about-KhV7b0eh.js'],
			['/assets/about-KhV7b0eh.js.map', 'about-KhV7b0eh.js.map'],
			['/assets/app-BCbIxvWG.css', 'app-BCbIxvWG.css'],
			['/assets/chunk-HA7DTUK3-BuRpdpNv.js', 'chunk-HA7DTUK3-BuRpdpNv.js'],
			[
				'/assets/chunk-HA7DTUK3-BuRpdpNv.js.map',
				'chunk-HA7DTUK3-BuRpdpNv.js.map',
			],
			['/assets/contact-CAFqY2E-.js', 'contact-CAFqY2E-.js'],
			['/assets/contact-CAFqY2E-.js.map', 'contact-CAFqY2E-.js.map'],
			['/assets/destroy-contact-l0sNRNKZ.js', 'destroy-contact-l0sNRNKZ.js'],
			[
				'/assets/destroy-contact-l0sNRNKZ.js.map',
				'destroy-contact-l0sNRNKZ.js.map',
			],
			['/assets/edit-contact-BdLKQrCo.js', 'edit-contact-BdLKQrCo.js'],
			['/assets/edit-contact-BdLKQrCo.js.map', 'edit-contact-BdLKQrCo.js.map'],
			['/assets/entry.client-CYM7CX8T.js', 'entry.client-CYM7CX8T.js'],
			['/assets/entry.client-CYM7CX8T.js.map', 'entry.client-CYM7CX8T.js.map'],
			['/assets/home-DZNPw7IY.js', 'home-DZNPw7IY.js'],
			['/assets/home-DZNPw7IY.js.map', 'home-DZNPw7IY.js.map'],
			['/assets/root-CKoa7dfp.js', 'root-CKoa7dfp.js'],
			['/assets/root-CKoa7dfp.js.map', 'root-CKoa7dfp.js.map'],
			['/assets/sidebar-BCxAqtYP.js', 'sidebar-BCxAqtYP.js'],
			['/assets/sidebar-BCxAqtYP.js.map', 'sidebar-BCxAqtYP.js.map'],
			['/assets/with-props-CTh-xW_a.js', 'with-props-CTh-xW_a.js'],
			['/assets/with-props-CTh-xW_a.js.map', 'with-props-CTh-xW_a.js.map'],
		] as const
		it.each(assetsResources)('assetsResources', (assetPath, file) => {
			expect(assetsPathRegex.test(assetPath)).toBe(true)
			const regexMatch = assetsPathRegex.exec(assetPath)
			console.log(regexMatch)
			expect(regexMatch).toContainEqual(file)
		})
		it.todo('Add some failing cases')
	})

	it('manifest', () => {
		const manifestUrl =
			'/__manifest?p=%2F&p=%2Fabout&p=%2Fcontacts%2Falex-anderson&p=%2Fcontacts%2Falexandra-spalato&p=%2Fcontacts%2Fandre-landgraf&p=%2Fcontacts%2Fandrew-petersen&p=%2Fcontacts%2Farisa-fukuzaki&p=%2Fcontacts%2Fashley-narcisse&p=%2Fcontacts%2Fbrandon-kish&p=%2Fcontacts%2Fbrian-lee&p=%2Fcontacts%2Fbrooks-lybrand&p=%2Fcontacts%2Fcameron-matheson&p=%2Fcontacts%2Fcat-johnson&p=%2Fcontacts%2Fchristopher-chedeau&p=%2Fcontacts%2Fclifford-fajardo&p=%2Fcontacts%2Fedmund-hung&p=%2Fcontacts%2Ferick-tamayo&p=%2Fcontacts%2Fgiovanni-benussi&p=%2Fcontacts%2Fglenn-reyes&p=%2Fcontacts%2Figor-minar&p=%2Fcontacts%2Fjon-jensen&p=%2Fcontacts%2Fkent_c.-dodds&p=%2Fcontacts%2Fmichael-jackson&p=%2Fcontacts%2Fmonica-powell&p=%2Fcontacts%2Fnevi-shah&p=%2Fcontacts%2Foscar-newman&p=%2Fcontacts%2Fpaul-bratslavsky&p=%2Fcontacts%2Fpedro-cattori&p=%2Fcontacts%2Fryan-florence&p=%2Fcontacts%2Fscott-smerchek&p=%2Fcontacts%2Fsean-mcquaid&p=%2Fcontacts%2Fshane-walker&p=%2Fcontacts%2Fshruti-kapoor&version=aac2b4b8'

		// Test that URL starts with /__manifest
		expect(manifestUrl.startsWith('/__manifest')).toBe(true)

		// Extract version from URL using URLSearchParams
		const url = new URL(manifestUrl, 'http://localhost')
		expect(url.searchParams.get('version')).toBe('aac2b4b8')
	})

	it.each([
		['/favicon.ico', 'favicon.ico'],
		['/some-Strange-file.pdf', 'some-Strange-file.pdf'],
	])('resources', (a, b) => {
		expect(fileNameRegex.test(a)).toBe(true)
		expect(fileNameRegex.exec(a)).toContainEqual(b)
	})
}
