# Express Trace Context

`traceheader` based Trace Context for [express.js](https://expressjs.com/).

Can be easily integrated with loggers.

- `.use(traceMiddleware)` in server setup.
- Call `getTraceContext()` (i.e. in your logging method) to get access to details from `traceparent` and `tracestate` HTTP headers.


# Example

```shell
$ npm -v
v8.19.2
```

```shell
$ node -v
v18.10.0
```

[src/example.ts](src/example.ts)

Console 1:
```shell
ts-node src/example.ts
```

Console 2:
```shell
curl -s http://localhost:3000 -H 'traceparent: 00-11223344556677889900aabbccddeeff-1234567890abcdef-01' -H 'Content-Type: application/json' -d '{ "some": "json body" }' | jq .
```


# References
- https://www.w3.org/TR/trace-context/
- https://w3c.github.io/trace-context/
- https://nodejs.org/api/async_context.html
- https://www.udemy.com/course/understanding-typescript/learn/lecture/17751414


# TODOs
- Implement rest of specification details
