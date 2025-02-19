import type express from 'express'

const viteDevServer = await import('vite').then((vite) =>
	vite.createServer({ server: { middlewareMode: true } }),
)

const expressRequestHandler = await (
	viteDevServer.ssrLoadModule('./server/express/app.ts') as Promise<
		typeof import('./app.ts')
	>
).then(({ createExpressRequestHandlerAdapter }) =>
	createExpressRequestHandlerAdapter(),
)

const reactRouterRequestHandler: typeof expressRequestHandler = async (
	req,
	res,
	next,
) => {
	try {
		return await expressRequestHandler(req, res, next)
	} catch (error: unknown) {
		if (error instanceof Error) {
			viteDevServer.ssrFixStacktrace(error)
		}
		next(error)
	}
}

export async function developmentApp(
	app: express.Express,
): Promise<express.Express> {
	console.log('Starting development server')

	return app //
		.use(viteDevServer.middlewares)
		.use(reactRouterRequestHandler)
}
