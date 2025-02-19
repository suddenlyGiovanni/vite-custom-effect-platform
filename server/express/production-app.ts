import express from 'express'
import type { createExpressRequestHandlerAdapter } from './app.ts'

/**
 * Short-circuit the type-checking of the built output.
 */
const reactRouterRequestHandler: ReturnType<
	typeof createExpressRequestHandlerAdapter
> = await import('../../build/server/index.js' as const).then(
	({ createExpressRequestHandlerAdapter }) =>
		createExpressRequestHandlerAdapter(),
)

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
