import express, { json, Router } from 'express'
import { getTraceContext, traceMiddleware } from '../src/express-trace-context' // 'express-trace-context' if npm -i

const SERVER_PORT = 3000

function logger(msg: string) {
    const tc = getTraceContext()
    const prefix = tc ? `[${tc?.version} ${tc?.traceId} ${tc?.parentId} ${tc?.isSampled}] ` : ''

    console.log(`${prefix}${msg}`) // eslint-disable-line no-console
}

const routes = Router().post('/', (req, res) => {
    logger(`Received: ${JSON.stringify(req.body)}`)
    res.status(200)
    res.json({
        traceContext: getTraceContext(),
        requestBody: req.body,
    })
    res.end()
})

const server = express()
    .use(traceMiddleware)
    .use(json())
    .use(routes)
    .use((req, res) => res.status(404).send({ error: 'Not Found' }))

server.listen(SERVER_PORT, () => logger(`Server started on port ${SERVER_PORT}`))
