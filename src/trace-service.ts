import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'

const FLAG_SAMPLED = 0b00000001

export interface TraceContext {
    version?: string
    traceId?: string
    parentId?: string
    childId?: string
    isSampled?: boolean
    traceState?: string
}

const asyncLocalStorage = new AsyncLocalStorage<TraceContext>()

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
    let version: string | undefined
    let traceId: string | undefined
    let parentId: string | undefined
    let flags: string | undefined
    let isSampled: boolean | undefined

    const traceParent = req.get('traceparent')
    if (traceParent) {
        ;[version, traceId, parentId, flags] = traceParent.split('-')
        isSampled = (+flags & FLAG_SAMPLED) === FLAG_SAMPLED // eslint-disable-line no-bitwise
    }

    const childId = newChildId()

    const traceContext: TraceContext = {
        version,
        traceId,
        parentId,
        childId,
        isSampled,
        traceState: req.get('tracestate'),
    }

    setTraceContext(traceContext)

    res.header('traceresponse', `${version ?? '?'}-${traceId ?? '?'}-${childId}-${flags ?? '?'}`)
    next()
}

function newChildId() {
    return randomHexString(8) + randomHexString(8)
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
