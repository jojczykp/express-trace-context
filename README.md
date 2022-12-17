# Express Trace Context

Trace Context handling for [express.js](https://expressjs.com/), based on `traceheader` and `tracestate`.

Can be easily integrated with loggers:
- `.use(traceMiddleware)` in server setup.
- Call `getTraceContext()` (i.e. in your logging method) to get access to details from `traceparent` and `tracestate` HTTP headers.


# Usage

```shell
npm i express-trace-context
```
See example at [example/example.ts](example/example.ts)


# Example

Console 1:

```shell
cd example
```

```shell
npm install
```

```shell
ts-node example.ts
```

```
Server started on port 3000
```

Console 2:

```shell
curl -s http://localhost:3000 -H 'traceparent: 00-11223344556677889900aabbccddeeff-1234567890abcdef-01' -H 'tracestate: congo=ucfJifl5GOE,rojo=00f067aa0ba902b7' -H 'Content-Type: application/json' -d '{ "some": "json body" }' | jq .
```

```
{
  "traceContext": {
... (details from request propagated here) ...
```

Also note logs in _Console 1_.


# Develop

```shell
npm run clean
```

```shell
npm install
```

```shell
npm run lint
```

```shell
npm run test
```

```shell
npm run build
```

```shell
npm push
```

# References
- https://www.w3.org/TR/trace-context/
- https://w3c.github.io/trace-context/
- https://nodejs.org/api/async_context.html
- https://www.udemy.com/course/understanding-typescript/learn/lecture/17751414

# TODOs
- Implement remaining of specification details once stable
