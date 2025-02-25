import { createServer } from 'node:http'
import type { HttpPlatform, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'

export const listen = (
	app: Layer.Layer<
		never,
		never,
		HttpPlatform.HttpPlatform | HttpServer.HttpServer
	>,
	port: number,
) =>
	// Run the application
	NodeRuntime.runMain(
		Layer.launch(
			Layer.provide(
				app,
				// Create a server layer with the specified port
				NodeHttpServer.layer(() => createServer(), { port }),
			),
		),
	)
