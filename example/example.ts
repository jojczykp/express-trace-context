import express, { json, Router } from 'express'
import { getTraceContext, traceMiddleware } from 'express-trace-context'

const SERVER_PORT = 3000

function log(msg: string) {
    const tc = getTraceContext()
    const prefix = tc ? `[${tc?.version} ${tc?.traceId} ${tc?.parentId} ${tc?.isSampled}] ` : ''

    console.log(`${prefix}${msg}`) // eslint-disable-line no-console
}

const routes = Router().post('/', (req, res) => {
    log(`Received: ${JSON.stringify(req.body)}`)
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

server.listen(SERVER_PORT, () => log(`Server started on port ${SERVER_PORT}`))
