import makeBarrier from '@strong-roots-capital/barrier'
import { Request, Response } from 'express'
import { expect, jest } from '@jest/globals'
import { TraceContext, traceMiddleware, getTraceContext, setTraceContext } from '../src/trace-service'

const hexNum16 = /^[0-9a-f]{16}$/

describe('Trace Service middleware produces Trace Context that', () => {
    let traceContext: TraceContext | undefined
    let res: Response

    beforeEach(() => {
        res = mockResponse()
        traceContext = undefined
        setTraceContext(traceContext)
    })

    it('should have updated parent-id', () => {
        const req = mockRequest({
            traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            tracestate: 'vendor1=opaque1,vendor2=opaque2',
        })

        traceMiddleware(req, res, () => {
            traceContext = getTraceContext()
        })

        expect(traceContext).toBeDefined()
        expect(traceContext?.version).toEqual('00')
        expect(traceContext?.traceId).toEqual('0af7651916cd43dd8448eb211c80319c')
        expect(traceContext?.parentId).toEqual('b7ad6b7169203331')
        expect(traceContext?.childId).toMatch(hexNum16)
        expect(traceContext?.isSampled).toBeTruthy()
        expect(res.header).toBeCalledWith('traceresponse', `00-${traceContext?.traceId}-${traceContext?.childId}-01`)
        expect(res.header).toBeCalledTimes(1)
    })

    it('should be undefined if no traceparent header present', () => {
        const req = mockRequest({
            tracestate: 'vendor1=opaque1,vendor2=opaque2',
        })

        traceMiddleware(req, res, () => {
            traceContext = getTraceContext()
        })

        expect(traceContext).toBeUndefined()
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
    return {
        header(h: string) {
            return headers[h]
        },
    } as unknown as Request
}

function mockResponse(): Response {
    return {
        header: jest.fn(),
    } as unknown as Response
}
