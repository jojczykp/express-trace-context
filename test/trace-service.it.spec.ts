import express, { json } from 'express'
import request from 'supertest'
import { Server } from 'http'
import { getTraceContext, traceMiddleware } from '../src/trace-service'

describe('Trace Service middleware', () => {
    // TODO: Cover all other specification details

    it('should inject trace context and return traceresponse', done => {
        const server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => res.json(getTraceContext()).end())
            .listen()

        request(server)
            .get('/')
            .set('traceparent', '00-123456789abcd-12ab-01')
            .expect(res => {
                expect(res.body).toMatchObject({
                    version: '00',
                    traceId: '123456789abcd',
                    parentId: '12ab',
                    childId: expect.stringMatching(/^[0-9a-f]{16}$/),
                    isSampled: true,
                })
            })
            .expect(res => {
                expect(res.get('traceresponse')).toMatch(/^00-123456789abcd-[0-9a-f]{16}-01$/)
            })
            .end(closeAndDone(server, done))
    })

    it('should inject trace context even if wrapped with async middleware', done => {
        const server = express()
            .use(traceMiddleware)
            .use(json()) // middleware with async call if body present (read from socket)
            .post('/', (req, res) => res.json(getTraceContext()).end())
            .listen()

        request(server)
            .post('/')
            .set('traceparent', '00-123456789abcd-12ab-01')
            .set('content-type', 'application/json')
            .send({ some: 'body' })
            .expect(res => expect(res.body).toBeDefined())
            .expect(res => expect(res.get('traceresponse')).toBeDefined())
            .end(closeAndDone(server, done))
    })

    it('should not inject trace context and not return traceresponse if traceparent is not passed', done => {
        const server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => res.json(getTraceContext() ?? {}).end())
            .listen()

        request(server)
            .get('/')
            .expect(res => expect(res.body).toEqual({}))
            .expect(res => expect(res.get('traceresponse')).toBeUndefined())
            .end(closeAndDone(server, done))
    })
})

function closeAndDone<T>(server: Server, done: jest.DoneCallback) {
    return (err: T) => {
        try {
            server.close()
            expect(err).toBeNull()
        } finally {
            done()
        }
    }
}
