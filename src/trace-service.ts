import { AsyncLocalStorage } from 'async_hooks'
import { NextFunction, Request, Response } from 'express'

const FLAG_SAMPLED = 0b00000001

const hexNum16 = /^[0-9a-f]{16}$/

export interface TraceContext {
    version?: string
    traceId?: string
    parentId?: string
    childId: string
    isSampled?: boolean
    traceState?: string
}

const asyncLocalStorage = new AsyncLocalStorage<TraceContext>()

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
    const traceContext: TraceContext = {
        childId: newChildId(),
        traceState: req.get('tracestate'),
    }

    const traceParent = req.get('traceparent')
    if (traceParent) {
        const [version, traceId, parentId, flags] = traceParent.split('-')
        if (hexNum16.test(parentId)) {
            traceContext.version = version
            traceContext.traceId = traceId
            traceContext.parentId = parentId
            traceContext.isSampled = (+flags & FLAG_SAMPLED) === FLAG_SAMPLED // eslint-disable-line no-bitwise
        }
    }

    setTraceContext(traceContext)

    res.header('traceresponse', formatTraceresponse(traceContext))
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

function formatTraceresponse(traceContext: TraceContext): string {
    const flagsStr = traceContext.isSampled === undefined ? '?' : toHexStr(traceContext.isSampled)
    return `${traceContext.version ?? '?'}-${traceContext.traceId ?? '?'}-${traceContext.childId}-${flagsStr}`
}

function toHexStr(b: boolean): string {
    return b ? '01' : '00'
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
