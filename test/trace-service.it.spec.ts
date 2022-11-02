import express from 'express'
import request from 'supertest'
import { getTraceContext, traceMiddleware } from '../src/trace-service'

describe('Trace Service', () => {
    it('should deliver express middleware that injects trace context', (done) => {
        let server = express()
            .use(traceMiddleware)
            .get('/', (req, res) => {
                res.json(getTraceContext()).end()
            })
            .listen()

        request(server)
            .get('/')
            .set('parent-id', 'p')
            .set('child-id', 'c')
            .expect({ parentId: 'p', childId: 'c', traceId: '1234', traceResponse: '00-1234-c-00' })
            .end((err) => {
                server.close()
                expect(err).toBeNull()
                done()
            })
    })
})
