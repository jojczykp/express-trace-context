import express, { json } from 'express'
import request from 'supertest'
import { Server } from 'http'
import { getTraceContext, traceMiddleware } from '../src/express-trace-context'

describe('Trace Service middleware', () => {
    it('should inject trace context and return traceresponse', done => {
        const server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => res.json(getTraceContext()).end())
            .listen()

        request(server)
            .get('/')
            .set('TracePaReNt', '00-1234567890abcdef1234567890abcdef-fedcba0987654321-01')
            .set('TrAcEstate', 'congo=ucfJifl5GOE,rojo=00f067aa0ba902b7')
            .expect(res => {
                expect(res.body).toMatchObject({
                    version: '00',
                    traceId: '1234567890abcdef1234567890abcdef',
                    parentId: 'fedcba0987654321',
                    childId: expect.stringMatching(/^[0-9a-f]{16}$/),
                    isSampled: true,
                    traceState: 'congo=ucfJifl5GOE,rojo=00f067aa0ba902b7',
                })
            })
            .expect(res => {
                expect(res.get('traceresponse')).toMatch(/^00-1234567890abcdef1234567890abcdef-[0-9a-f]{16}-01$/)
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
            .set('traceparent', '00-1234567890abcdef1234567890abcdef-fedcba0987654321-01')
            .set('content-type', 'application/json')
            .send({ some: 'body' })
            .expect(res => expect(res.body).toBeDefined())
            .expect(res => expect(res.get('traceresponse')).toBeDefined())
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
