import { HttpRouter } from '@effect/platform'
import { Effect } from 'effect'

import { viteMiddleware } from '../middlewares/vite-middleware.ts'
import { ViteDevServerService } from '../services/vite-service.ts'

export const Development = HttpRouter.empty.pipe(
	HttpRouter.all(
		'*',
		ViteDevServerService.pipe(
			Effect.flatMap((viteDevServer) =>
				Effect.promise(
					() =>
						viteDevServer.ssrLoadModule(
							'./server/effect-platform/handler/handler.ts',
						) as Promise<typeof import('../handler/handler.ts')>,
				),
			),
			Effect.flatMap(({ handler }) => handler),
		),
	),

	HttpRouter.use(viteMiddleware),
)
