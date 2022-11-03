import express from 'express'
import request from 'supertest'
import { getTraceContext, traceMiddleware } from '../src/trace-service'

describe('Trace Service deliver express middleware that', () => {
    it('should inject trace context (even if wrapped with async middleware)', (done) => {
        let server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => {
                res.json(getTraceContext()).end()
            })
            .listen()

        request(server)
            .get('/')
            .set('traceparent', '00-123456789abcd-12ab-01')
            .expect({ version: '00', traceId: '123456789abcd', parentId: '1234567890abcdef', isSampled: true })
            .end((err) => {
                try {
                    server.close()
                    expect(err).toBeNull()
                } finally {
                    done()
                }
            })
    })
})
