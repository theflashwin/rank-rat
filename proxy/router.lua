--
--  router.lua (production)
--  Routes WebSocket connections based on room_id via Local Redis Bridge
--

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
-- NOW ACCEPTS txn for logging
local function redis_get(txn, room_id)
    local sock = core.tcp()

    -- Timeouts (safe on localhost)
    -- sock:settimeout("connect", 200)
    -- sock:settimeout("receive", 200)
    -- sock:settimeout("send", 200)

    log(txn, "[redis_get] Connecting to bridge " .. redis_host .. ":" .. redis_port)
    if not sock:connect(redis_host, redis_port) then
        log(txn, "[redis_get] ERROR: Connection failed")
        return nil
    end

    local key = "room:" .. room_id
    local cmd = string.format("*2\r\n$3\r\nGET\r\n$%d\r\n%s\r\n", #key, key)
    
    log(txn, "[redis_get] Sending command for key: " .. key)
    sock:send(cmd)

    local line = sock:receive("*l")
    if not line then 
        log(txn, "[redis_get] ERROR: No response line received from Redis")
        sock:close()
        return nil 
    end

    -- *** CRITICAL DEBUG LOG ***
    -- This will tell us if Redis sent "-NOAUTH", "-ERR", or "$..."
    log(txn, "[redis_get] RAW RESPONSE FROM REDIS: " .. tostring(line))

    if line:sub(1,1) == "$" then
        local len = tonumber(line:sub(2))
        if len == -1 then 
            log(txn, "[redis_get] Key not found (Redis returned -1)")
            sock:close()
            return nil 
        end
        
        local data = sock:receive(len)
        sock:receive(2) -- Consume CRLF
        
        log(txn, "[redis_get] SUCCESS: Retrieved backend -> " .. tostring(data))
        sock:close()
        return data
    else
        log(txn, "[redis_get] ERROR: Unexpected response format. Returning nil.")
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
        log(txn, string.format("[route_ws] CACHE HIT %s -> %s", room_id, cached.backend))
        txn:set_var("txn.backend_name", cached.backend)
        return
    end

    -- Query Redis (passing txn now)
    log(txn, "[route_ws] CACHE MISS. Querying Redis for " .. room_id)
    local backend = redis_get(txn, room_id) 

    if not backend then
        log(txn, "[route_ws] Redis lookup failed or empty. Defaulting to server0")
        backend = "server0"
    end
    
    -- Cache for 10s
    local ttl = 10000
    cache[room_id] = {
        backend = backend,
        expiry = now_ms + ttl
    }

    log(txn, string.format("[route_ws] FINAL DECISION: room %s -> %s", room_id, backend))
    txn:set_var("txn.backend_name", backend)
end)