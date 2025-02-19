import express from 'express'

/**
 * Short-circuit the type-checking of the built output.
 */
const BUILD_PATH = '../../build/server/index.js' as const

export async function productionApp(
	app: express.Express,
): Promise<express.Express> {
	console.log('Starting production server')

	return app
		.use(
			'/assets',
			express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
		)
		.use(express.static('build/client', { maxAge: '1h' }))
		.use(await import(BUILD_PATH).then((mod) => mod.default))
}
