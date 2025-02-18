import express from 'express'

/**
 * Short-circuit the type-checking of the built output.
 */
const BUILD_PATH = '../build/server/index.js' as const

export default async function production(
	app: express.Express,
): Promise<express.Express> {
	console.log('Starting production server')
	app.use(
		'/assets',
		express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
	)
	app.use(express.static('build/client', { maxAge: '1h' }))
	app.use(await import(BUILD_PATH).then((mod) => mod.default))

	return app
}
