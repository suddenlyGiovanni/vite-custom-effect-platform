import type { IncomingMessage, ServerResponse } from 'node:http'
import {
	Headers,
	HttpServerRequest,
	HttpServerResponse,
} from '@effect/platform'
import { NodeHttpServerRequest } from '@effect/platform-node'
import { Effect, Stream } from 'effect'
import * as ReactRouter from 'react-router'

import { createReactRouterRequest } from './create-react-router-request.ts'

type GetLoadContextFunction = (
	req: IncomingMessage,
	res: ServerResponse<IncomingMessage>,
) => Promise<ReactRouter.AppLoadContext> | ReactRouter.AppLoadContext

export function createHttpHandler({
	build,
	getLoadContext,
	mode,
}: {
	build: ReactRouter.ServerBuild | (() => Promise<ReactRouter.ServerBuild>)
	getLoadContext?: GetLoadContextFunction
	mode?: 'development' | 'production'
}): Effect.Effect<
	HttpServerResponse.HttpServerResponse,
	never,
	HttpServerRequest.HttpServerRequest
> {
	const handleRequest = ReactRouter.createRequestHandler(build, mode)

	return Effect.gen(function* () {
		const httpServerRequest = yield* HttpServerRequest.HttpServerRequest
		const incomingMessage =
			NodeHttpServerRequest.toIncomingMessage(httpServerRequest)
		const serverResponse =
			NodeHttpServerRequest.toServerResponse(httpServerRequest)

		const request: Request = createReactRouterRequest(
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
