import { HttpRouter } from '@effect/platform'
import { Effect } from 'effect'

import { ViteDevServerService } from './services/vite-service.ts'
import { viteMiddleware } from './vite-middleware.ts'

export const Development = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		Effect.gen(function* () {
			const viteDevServer = yield* ViteDevServerService

			const { handler } = yield* Effect.promise(
				() =>
					viteDevServer.ssrLoadModule(
						'./server/effect-platform/handler.ts',
					) as Promise<typeof import('./handler.ts')>,
			)

			return yield* handler
		}),
	),

	HttpRouter.use(viteMiddleware),
)
