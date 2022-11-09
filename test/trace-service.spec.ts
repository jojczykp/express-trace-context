import makeBarrier from '@strong-roots-capital/barrier'
import { Request, Response } from 'express'
import { expect, jest } from '@jest/globals'
import { TraceContext, traceMiddleware, getTraceContext, setTraceContext } from '../src/trace-service'

/* eslint no-return-assign: "off" */

const hexNum16 = /^[0-9a-f]{16}$/

describe('Trace Service middleware', () => {
    let traceContext: TraceContext | undefined
    let res: Response

    beforeEach(() => {
        res = mockResponse()
        traceContext = undefined
        setTraceContext(traceContext)
    })

    it('should produce full TraceContext', () => {
        const req = mockRequest({
            traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            tracestate: 'vendor1=opaque3,vendor2=opaque4',
        })

        traceMiddleware(req, res, () => (traceContext = getTraceContext()))

        expect(traceContext).toBeDefined()
        expect(traceContext?.version).toEqual('00')
        expect(traceContext?.traceId).toEqual('0af7651916cd43dd8448eb211c80319c')
        expect(traceContext?.parentId).toEqual('b7ad6b7169203331')
        expect(traceContext?.childId).toMatch(hexNum16)
        expect(traceContext?.isSampled).toBeTruthy()
        expect(traceContext?.traceState).toEqual('vendor1=opaque3,vendor2=opaque4')
        expect(res.header).toBeCalledWith('traceresponse', `00-${traceContext?.traceId}-${traceContext?.childId}-01`)
        expect(res.header).toBeCalledTimes(1)
    })

    it('should produce full TraceContext even if headers passed are not in lowercase', () => {
        const req = mockRequest({
            TrAcEpArEnT: '00-0af7651926cd43dd5448cb211c80319c-b7ad3b7169203def-01',
            tRaCeStAtE: 'vendor1=opaque5,vendor2=opaque6',
        })

        traceMiddleware(req, res, () => (traceContext = getTraceContext()))

        expect(traceContext).toBeDefined()
        expect(traceContext?.version).toEqual('00')
        expect(traceContext?.traceId).toEqual('0af7651926cd43dd5448cb211c80319c')
        expect(traceContext?.parentId).toEqual('b7ad3b7169203def')
        expect(traceContext?.childId).toMatch(hexNum16)
        expect(traceContext?.isSampled).toBeTruthy()
        expect(traceContext?.traceState).toEqual('vendor1=opaque5,vendor2=opaque6')
        expect(res.header).toBeCalledWith('traceresponse', `00-${traceContext?.traceId}-${traceContext?.childId}-01`)
        expect(res.header).toBeCalledTimes(1)
    })

    it('should produce TraceContext with no tracestate is no such a header present', () => {
        const req = mockRequest({
            traceparent: '00-1bf7451216ad43dd6748ac211c8031a1-a7126b71d92f333e-01',
        })

        traceMiddleware(req, res, () => (traceContext = getTraceContext()))

        expect(traceContext).toBeDefined()
        expect(traceContext?.version).toEqual('00')
        expect(traceContext?.traceId).toEqual('1bf7451216ad43dd6748ac211c8031a1')
        expect(traceContext?.parentId).toEqual('a7126b71d92f333e')
        expect(traceContext?.childId).toMatch(hexNum16)
        expect(traceContext?.isSampled).toBeTruthy()
        expect(traceContext?.traceState).toBeUndefined()
        expect(res.header).toBeCalledWith('traceresponse', `00-${traceContext?.traceId}-${traceContext?.childId}-01`)
        expect(res.header).toBeCalledTimes(1)
    })

    it('should produce Trace Context with no traceparent details if no traceparent header present', () => {
        const req = mockRequest({
            tracestate: 'vendor1=opaque7,vendor2=opaque8',
        })

        traceMiddleware(req, res, () => {
            traceContext = getTraceContext()
        })

        expect(traceContext).toBeDefined()
        expect(traceContext?.version).toBeUndefined()
        expect(traceContext?.traceId).toBeUndefined()
        expect(traceContext?.parentId).toBeUndefined()
        expect(traceContext?.childId).toMatch(hexNum16)
        expect(traceContext?.isSampled).toBeUndefined()
        expect(traceContext?.traceState).toEqual('vendor1=opaque7,vendor2=opaque8')
        expect(res.header).toBeCalledWith('traceresponse', `?-?-${traceContext?.childId}-?`)
        expect(res.header).toBeCalledTimes(1)
    })

    it('should produce TraceContext with isSampled true', () => {
        const req = mockRequest({
            traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        })

        traceMiddleware(req, res, () => (traceContext = getTraceContext()))

        expect(traceContext?.isSampled).toBeTruthy()
    })

    it('should produce TraceContext with isSampled false', () => {
        const req = mockRequest({
            traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00',
        })

        traceMiddleware(req, res, () => (traceContext = getTraceContext()))

        expect(traceContext?.isSampled).toBeFalsy()
    })

    it('should be a different instance for each concurrent request', async () => {
        // Given
        let traceContext1: TraceContext | undefined
        let traceContext2: TraceContext | undefined
        const req1 = mockRequest({ traceparent: '00-1111-11-00' })
        const req2 = mockRequest({ traceparent: '00-2222-22-01' })
        const res1 = mockResponse()
        const res2 = mockResponse()
        const bothContextsFilled = makeBarrier(2)
        const bothContextsObtained = makeBarrier(2)

        // When
        setImmediate(() => {
            traceMiddleware(req1, res1, async () => {
                await bothContextsFilled()
                traceContext1 = getTraceContext()
                await bothContextsObtained()
            })
        })

        setImmediate(() => {
            traceMiddleware(req2, res2, async () => {
                await bothContextsFilled()
                traceContext2 = getTraceContext()
                await bothContextsObtained()
            })
        })

        await bothContextsFilled()
        await bothContextsObtained()

        // Then
        expect(traceContext1).not.toBeUndefined()
        expect(traceContext2).not.toBeUndefined()
        expect(traceContext1?.traceId).not.toEqual(traceContext2?.traceId)
    })
})

function mockRequest(headers: Record<string, string>): Request {
    const headersLowCase = lowCaseKeys(headers)
    return {
        get(h: string) {
            return headersLowCase[h.toLowerCase()]
        },
    } as unknown as Request
}

function mockResponse(): Response {
    return {
        header: jest.fn(),
    } as unknown as Response
}

function lowCaseKeys(record: Record<string, string>) {
    return Object.keys(record)
        .map(k => Object({ [k.toLowerCase()]: record[k] }))
        .reduce((acc, curr) => Object.assign(acc, curr))
}
