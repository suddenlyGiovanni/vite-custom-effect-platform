import compression from 'compression'
import express from 'express'
import morgan from 'morgan'

import { developmentApp } from './development-app.ts'
import { productionApp } from './production-app.ts'

const DEVELOPMENT = process.env['NODE_ENV'] === 'development'
const PORT = Number.parseInt(process.env['PORT'] || '3000')

const app = express()

app.use(compression())
app.disable('x-powered-by')

if (DEVELOPMENT) {
	await developmentApp(app)
} else {
	await productionApp(app)
}

app.use(morgan('tiny'))

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`)
})
