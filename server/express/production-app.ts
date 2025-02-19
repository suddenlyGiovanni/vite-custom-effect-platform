import express from 'express'

const reactRouterRequestHandler = await import(
	/**
	 * Short-circuit the type-checking of the built output.
	 */
	'../../build/server/index.js' as const
).then((mod: typeof import('./app.ts')) => mod.reactRouterRequestHandler)

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
		.use(reactRouterRequestHandler)
}
