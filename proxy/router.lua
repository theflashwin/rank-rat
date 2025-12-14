--
--  router.lua (production)
--
--  Routes WebSocket connections based on room_id in URL path:
--      /ws/<room_id>
--
--  Looks up Redis key: room:<room_id> → backend name
-- 
--  Routes all other routes to sink server
--

local redis_host = "red-d4v3gdre5dus73a6bke0"
local redis_port = 6379

-- 100ms local cache to avoid Redis hammering during reconnect storms
local cache = {}

local function log(txn, msg)
    if txn and txn.Info then
        txn:Info(msg)
    end
end

-- Read Redis GET(room:<id>) using HAProxy TCP API
local function redis_get(room_id)
    local sock = core.tcp()

    -- TODO: figure out why this isn't working
    -- sock:settimeout("connect", 200)
    -- sock:settimeout("receive", 200)
    -- sock:settimeout("send", 200)

    if not sock:connect(redis_host, redis_port) then
        return nil
    end

    local key = "room:" .. room_id
    local cmd = string.format("*2\r\n$3\r\nGET\r\n$%d\r\n%s\r\n", #key, key)
    sock:send(cmd)

    local line = sock:receive("*l")
    if not line then return nil end

    if line:sub(1,1) == "$" then
        local len = tonumber(line:sub(2))
        if len == -1 then return nil end
        local data = sock:receive(len)
        sock:receive(2) -- CRLF
        return data
    end

    return nil
end

-- Main entry point for HAProxy
core.register_action("route_ws", {"http-req"}, function(txn)
    local path = txn.sf:path()
    log(txn, "[route_ws] handling path " .. path)

    -- Extract room_id from "/ws/<alphanumeric>"
    local room_id = path:match("^/ws/([%w]+)$")

    if not room_id then
        -- non /ws/ path, fallback to sink server (server0)
        log(txn, "[route_ws] non ws path, routing to server0")
        txn:set_var("txn.backend_name", "server0")
        return
    end

    -- Check cache first
    local now = core.now()
    local now_ms = (now.sec * 1000) + math.floor(now.usec / 1000)
    local cached = cache[room_id]
    if cached and cached.expiry > now_ms then
        log(txn, string.format("[route_ws] cache hit for room %s -> %s", room_id, cached.backend))
        txn:set_var("txn.backend_name", cached.backend)
        return
    end

    -- Query Redis
    local backend = redis_get(room_id) or "server0"
    log(txn, string.format("[route_ws] cache miss for room %s, selected %s", room_id, backend))

    -- Cache for 10000ms (10 s)
    local ttl = 10000
    cache[room_id] = {
        backend = backend,
        expiry = now_ms + ttl
    }

    log(txn, string.format("[route_ws] routing room %s to %s", room_id, backend))
    txn:set_var("txn.backend_name", backend)
end)
