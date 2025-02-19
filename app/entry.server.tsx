import { PassThrough } from 'node:stream'

import { isbot } from 'isbot'
import type { RenderToPipeableStreamOptions } from 'react-dom/server'
import { renderToPipeableStream } from 'react-dom/server'
import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'

import { createReadableStreamFromReadable } from '../server/react-router-node/index.ts'

export const streamTimeout = 5_000

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: AppLoadContext,
): Promise<Response> {
	return new Promise<Response>((resolve, reject) => {
		let shellRendered = false
		const userAgent = request.headers.get('user-agent')

		/**
		 * Ensure requests from bots and SPA Mode renders wait for all content to load before responding
		 * https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
		 */
		const readyOption: keyof RenderToPipeableStreamOptions =
			(userAgent && isbot(userAgent)) || routerContext.isSpaMode
				? 'onAllReady'
				: 'onShellReady'

		const { pipe, abort } = renderToPipeableStream(
			<ServerRouter context={routerContext} url={request.url} />,
			{
				[readyOption]() {
					shellRendered = true
					const body = new PassThrough()
					const stream = createReadableStreamFromReadable(body)

					responseHeaders.set('Content-Type', 'text/html')

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						}),
					)

					pipe(body)
				},
				onShellError(error: unknown) {
					reject(error)
				},
				onError(error: unknown) {
					responseStatusCode = 500
					/**
					 * Log streaming rendering errors from inside the shell.  Don't log
					 * errors encountered during initial shell rendering since they'll
					 * reject and get logged in handleDocumentRequest.
					 */
					if (shellRendered) {
						console.error(error)
					}
				},
			},
		)

		/**
		 * Abort the rendering stream after the `streamTimeout` so it has time to
		 * flush down the rejected boundaries
		 */
		setTimeout(abort, streamTimeout + 1000)
	})
}
