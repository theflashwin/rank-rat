--
--  router.lua (production)
--  Routes WebSocket connections based on room_id via Local Redis Bridge
--

-- Connect to the local HAProxy bridge defined in haproxy.cfg
local redis_host = "127.0.0.1"
local redis_port = "6379"

-- 100ms local cache to avoid Redis hammering
local cache = {}

local function log(txn, msg)
    if txn and txn.Info then
        txn:Info(msg)
    end
end

-- Read Redis GET(room:<id>)
local function redis_get(room_id)
    local sock = core.tcp()

    -- Timeouts are safe now that we are connecting to localhost
    sock:settimeout("connect", 200)
    sock:settimeout("receive", 200)
    sock:settimeout("send", 200)

    -- Connect to local bridge
    if not sock:connect(redis_host, redis_port) then
        return nil
    end

    local key = "room:" .. room_id
    local cmd = string.format("*2\r\n$3\r\nGET\r\n$%d\r\n%s\r\n", #key, key)
    sock:send(cmd)

    local line = sock:receive("*l")
    if not line then 
        sock:close()
        return nil 
    end

    if line:sub(1,1) == "$" then
        local len = tonumber(line:sub(2))
        if len == -1 then 
            sock:close()
            return nil 
        end
        local data = sock:receive(len)
        sock:receive(2) -- Consume CRLF
        sock:close()
        return data
    end

    sock:close()
    return nil
end

-- Main entry point
core.register_action("route_ws", {"http-req"}, function(txn)
    local path = txn.sf:path()
    
    -- Extract room_id
    local room_id = path:match("^/ws/([%w]+)$")

    if not room_id then
        log(txn, "[route_ws] non ws path, routing to server0")
        txn:set_var("txn.backend_name", "server0")
        return
    end

    -- Check cache
    local now = core.now()
    local now_ms = (now.sec * 1000) + math.floor(now.usec / 1000)
    local cached = cache[room_id]
    if cached and cached.expiry > now_ms then
        log(txn, string.format("[route_ws] cache hit %s -> %s", room_id, cached.backend))
        txn:set_var("txn.backend_name", cached.backend)
        return
    end

    -- Query Redis (via bridge)
    local backend = redis_get(room_id) or "server0"
    
    -- Cache for 10s
    local ttl = 10000
    cache[room_id] = {
        backend = backend,
        expiry = now_ms + ttl
    }

    log(txn, string.format("[route_ws] routing room %s to %s", room_id, backend))
    txn:set_var("txn.backend_name", backend)
end)