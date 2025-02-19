import compression from 'compression'
import { pipe } from 'effect'
import express from 'express'
import morgan from 'morgan'
import { developmentApp } from './development-app.ts'
import { productionApp } from './production-app.ts'

const PORT = Number.parseInt(process.env['PORT'] || '3000')

pipe(
	express()
		.use(compression())
		.disable('x-powered-by'), //
	async (app) =>
		process.env['NODE_ENV'] === 'development'
			? await developmentApp(app) //
			: await productionApp(app),
	(promise) =>
		promise.then((app) =>
			app
				.use(morgan('dev')) //
				.listen(PORT, () => {
					console.log(`Server is running on http://localhost:${PORT}`)
				}),
		),
)
