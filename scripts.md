## Proxy

**Log Statements**
`haproxy -db -f proxy/haproxy.cfg`

**Don't Log**
`haproxy -f proxy/haproxy.cfg`

## Server

**Server**

`go run server.go -port ${PORT}`