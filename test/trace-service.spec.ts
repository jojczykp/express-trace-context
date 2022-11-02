import { TraceContext, traceMiddleware, getTraceContext } from '../src/trace-service'
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

describe('Trace Service middleware', () => {
    let traceContext: TraceContext | undefined
    let res: Response

    beforeEach(() => {
        traceContext = undefined
        res = mockResponse()
    })

    it('should update parent-id', () => {
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
})
