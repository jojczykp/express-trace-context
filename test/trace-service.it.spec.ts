import express, { json } from 'express'
import request from 'supertest'
import { getTraceContext, traceMiddleware } from '../src/trace-service'

describe('Trace Service middleware', () => {
    it('should inject trace context', done => {
        const server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => res.json(getTraceContext()).end())
            .listen()

        request(server)
            .get('/')
            .set('traceparent', '00-123456789abcd-12ab-01')
            .expect({ version: '00', traceId: '123456789abcd', parentId: '1234567890abcdef', isSampled: true })
            .end(err => {
                try {
                    server.close()
                    expect(err).toBeNull()
                } finally {
                    done()
                }
            })
    })

    it('should inject trace context even if wrapped with async middleware', done => {
        const server = express()
            .use(traceMiddleware)
            .use(json()) // middleware with async call if body present (reads from socket)
            .post('/', (req, res) => res.json(getTraceContext()).end())
            .listen()

        request(server)
            .post('/')
            .set('traceparent', '00-123456789abcd-12ab-01')
            .set('content-type', 'application/json')
            .send({ some: 'body' })
            .expect({ version: '00', traceId: '123456789abcd', parentId: '1234567890abcdef', isSampled: true })
            .end(err => {
                try {
                    server.close()
                    expect(err).toBeNull()
                } finally {
                    done()
                }
            })
    })
})
