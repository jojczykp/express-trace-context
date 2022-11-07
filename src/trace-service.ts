import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'

const FLAG_SAMPLED = 0b00000001

export interface TraceContext {
    version: string
    traceId: string
    parentId: string
    childId: string
    isSampled: boolean
}

const asyncLocalStorage = new AsyncLocalStorage<TraceContext>()

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
    const traceParent = req.header('traceparent')
    if (!traceParent) {
        next()
        return
    }

    const [version, traceId, parentId, flags] = traceParent.split('-')

    const childId = randomHexString(8) + randomHexString(8)
    const isSampled = (+flags & FLAG_SAMPLED) === FLAG_SAMPLED // eslint-disable-line no-bitwise

    const traceContext: TraceContext = {
        version,
        traceId,
        parentId,
        childId,
        isSampled,
    }

    setTraceContext(traceContext)

    res.header('traceresponse', `${version}-${traceId}-${childId}-${isSampled ? '01' : '00'}`)
    next()

    // TODO: Cover all other specification details
}

function randomHexString(length: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13): string {
    return Math.random()
        .toString(16)
        .substring(2, length + 2)
}

export function getTraceContext(): TraceContext | undefined {
    return asyncLocalStorage.getStore()
}

export function setTraceContext(traceContext: TraceContext | undefined) {
    if (traceContext) {
        // Recommended way is to use `AsyncLocalStorage.run()`.
        // Unfortunately that not always works, i.e. in case of async middlewares.
        // See: https://github.com/expressjs/express/issues/4396
        // Therefore with express4 we use older way as follows:
        asyncLocalStorage.enterWith(traceContext)
    } else {
        asyncLocalStorage.disable()
    }
}
