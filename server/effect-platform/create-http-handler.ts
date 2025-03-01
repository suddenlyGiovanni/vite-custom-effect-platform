import type { IncomingMessage, ServerResponse } from 'node:http'
import { Headers, HttpServerResponse } from '@effect/platform'
import { Effect, Stream } from 'effect'
import * as ReactRouter from 'react-router'

import { createRemixRequest } from './create-remix-request.ts'

type GetLoadContextFunction = (
	req: IncomingMessage,
	res: ServerResponse<IncomingMessage>,
) => Promise<ReactRouter.AppLoadContext> | ReactRouter.AppLoadContext

export function createHttpHandler({
	build,
	getLoadContext,
	mode = process.env['NODE_ENV'],
}: {
	build: ReactRouter.ServerBuild | (() => Promise<ReactRouter.ServerBuild>)
	getLoadContext?: GetLoadContextFunction
	mode?: 'development' | 'production' | (string & {})
}) {
	const handleRequest = ReactRouter.createRequestHandler(build, mode)

	return (
		incomingMessage: IncomingMessage,
		serverResponse: ServerResponse<IncomingMessage>,
	) =>
		Effect.gen(function* () {
			const request: Request = createRemixRequest(
				incomingMessage,
				serverResponse,
			)

			let loadContext: ReactRouter.AppLoadContext | undefined = undefined

			if (getLoadContext) {
				loadContext = yield* Effect.promise(
					async () => await getLoadContext(incomingMessage, serverResponse),
				)
			}

			const response: Response = yield* Effect.promise(() =>
				handleRequest(request, loadContext),
			)
			if (response.headers.get('Content-Type')?.match(/text\/event-stream/i)) {
				serverResponse.flushHeaders()
			}

			const options: HttpServerResponse.Options = {
				status: response.status,
				statusText: response.statusText,
				headers: Headers.fromInput(response.headers),
			}

			if (response.body) {
				return yield* HttpServerResponse.stream(
					Stream.fromReadableStream(
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						() => response.body!,
						(error) =>
							new Error(`Error reading response stream: ${String(error)}`),
					),
					options,
				)
			}

			return yield* HttpServerResponse.empty(options)
		})
}
