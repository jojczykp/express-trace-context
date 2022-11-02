import { TraceContext, traceMiddleware, getTraceContext } from '../src/trace-service'
import { Request, Response } from 'express'
import { expect, jest } from '@jest/globals'

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

    it('should', () => {
        const req = mockRequest({
            tracestate: 'some-opaque-trace-state',
        })

        traceMiddleware(req, res, () => {
            traceContext = getTraceContext()
        })

        expect(traceContext).not.toBeUndefined()
        expect(traceContext?.parentId).toBeUndefined()
        expect(traceContext?.traceResponse).toEqual(`00-${traceContext?.traceId}-${traceContext?.childId}-00`)
        expect(res.header).toHaveBeenCalledWith('traceresponse', traceContext?.traceResponse)
        expect(res.header).toHaveBeenCalledTimes(1)
    })
})
