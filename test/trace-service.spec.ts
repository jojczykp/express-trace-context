import { TraceContext, traceMiddleware, getTraceContext } from '../src/trace-service'
import makeBarrier from '@strong-roots-capital/barrier'
import { Request, Response } from 'express'
import { expect, jest } from '@jest/globals'

const hexNum16 = /^[0-9a-f]{16}$/

function mockRequest(headers: Record<string, string>): Request {
    return {
        header(h: string) {
            return headers[h]
        },
    } as unknown as Request
}

function mockResponse(): Response {
    return {
        header: jest.fn()
    } as unknown as Response
}

describe('Trace Service middleware produces Trace Context that', () => {
    let traceContext: TraceContext | undefined
    let res: Response

    beforeEach(() => {
        traceContext = undefined
        res = mockResponse()
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
        expect(traceContext?.parentId).toMatch(hexNum16)
        expect(traceContext?.parentId).not.toEqual('b7ad6b7169203331')
        expect(traceContext?.isSampled).toBeTruthy()
        // expect(traceContext?.traceResponse).toEqual(`00-${traceContext?.traceId}-${traceContext?.childId}-00`)
        // expect(res.header).toHaveBeenCalledWith('traceresponse', traceContext?.traceResponse)
        // expect(res.header).toHaveBeenCalledTimes(1)
    })

    it('is a different instance for each concurrent request', async () => {
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
        // expect(res1.header).toBeCalledWith('traceresponse', traceContext1?.traceResponse)
        // expect(res2.header).toBeCalledWith('traceresponse', traceContext2?.traceResponse)
    })
})
