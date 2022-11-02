import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'

const asyncLocalStorage = new AsyncLocalStorage<TraceContext>()

export interface TraceContext {
    parentId?: string,
    childId?: string,
    traceId?: string,
    traceResponse?: string
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
    const traceId = '1234'
    const childId = req.header('child-id')

    const traceContext: TraceContext = {
        parentId: req.header('parent-id'),
        childId,
        traceId,
        traceResponse: `00-${traceId}-${childId}-00`
    }

    setTraceContext(traceContext)

    res.header('traceresponse',  traceContext.traceResponse)
    next()
}

export function getTraceContext(): TraceContext | undefined {
    return asyncLocalStorage.getStore()
}

export function setTraceContext(traceContext: TraceContext | undefined) {
    if (traceContext) {
        // Recommended way is to use `AsyncLocalStorage.run()`.
        // Unfortunately we can't due to the following issue:
        // https://github.com/expressjs/express/issues/4396
        // Therefore with express4 we use older way as follows.
        asyncLocalStorage.enterWith(traceContext)
    } else {
        asyncLocalStorage.disable()
    }
}
