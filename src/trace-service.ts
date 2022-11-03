import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'

const FLAG_SAMPLED = 0b00000001

const asyncLocalStorage = new AsyncLocalStorage<TraceContext>()

export interface TraceContext {
    version: string,
    traceId?: string,
    parentId?: string,
    isSampled?: boolean
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
    const traceParent = req.header('traceparent')
    const [version, traceId, upstreamParentId, flags] = traceParent!.split('-')

    const parentId = '1234567890abcdef'
    const isSampled = (+flags & FLAG_SAMPLED) == FLAG_SAMPLED

    const traceContext: TraceContext = {
        version,
        traceId,
        parentId,
        isSampled
    }

    setTraceContext(traceContext)

    // res.header('traceresponse',  traceContext.traceResponse)
    next()
}

export function getTraceContext(): TraceContext | undefined {
    return asyncLocalStorage.getStore()
}

export function setTraceContext(traceContext: TraceContext | undefined) {
    if (traceContext) {
        // Recommended way is to use `AsyncLocalStorage.run()`.
        // Unfortunately that not always work, i.e. in case of async middlewares:
        // https://github.com/expressjs/express/issues/4396
        // Therefore with express4 we use older way as follows.
        asyncLocalStorage.enterWith(traceContext)
    } else {
        asyncLocalStorage.disable()
    }
}
