import { createServer } from 'node:http'
import { HttpMiddleware, HttpRouter, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer, pipe } from 'effect'

import { handler } from './handler.ts'
import { viteMiddleware } from './vite-middleware.ts'

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
	HttpRouter.all('*', handler.pipe(viteMiddleware)),
)

// Set up the application server with logging
const app = pipe(
	router,
	HttpServer.serve(HttpMiddleware.logger),
	HttpServer.withLogAddress,
)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))
