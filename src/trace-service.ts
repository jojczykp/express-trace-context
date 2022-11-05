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

    const childId = '1234567890abcdef'
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
