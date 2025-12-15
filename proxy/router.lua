--
--  router.lua (production)
--

local redis_host = "127.0.0.1"
local redis_port = "6379"

-- ==========================================================
-- CREDENTIALS (Redis Labs)
-- ==========================================================
local redis_user = "default"
local redis_pass = "Vz0GziFaI9w09JuS55apfsXtQcb3jok5"

-- 100ms local cache
local cache = {}

local function log(txn, msg)
    if txn and txn.Info then
        txn:Info(msg)
    end
end

local function redis_get(txn, room_id)
    local sock = core.tcp()
    -- sock:settimeout("connect", 200)
    -- sock:settimeout("receive", 200)
    -- sock:settimeout("send", 200)

    log(txn, "[redis_get] Connecting to bridge...")
    if not sock:connect(redis_host, redis_port) then
        log(txn, "[redis_get] ERROR: Connection failed")
        return nil
    end

    -- ==========================================================
    -- AUTHENTICATION
    -- ==========================================================
    if redis_pass and redis_pass ~= "" then
        -- Redis Labs usually supports ACL (AUTH user pass)
        local auth_cmd = string.format("*3\r\n$4\r\nAUTH\r\n$%d\r\n%s\r\n$%d\r\n%s\r\n", 
            #redis_user, redis_user, #redis_pass, redis_pass)
        
        sock:send(auth_cmd)
        
        local auth_resp = sock:receive("*l")
        if not auth_resp or auth_resp:sub(1,1) == "-" then
            log(txn, "[redis_get] AUTH FAILED: " .. tostring(auth_resp))
            sock:close()
            return nil
        end
        log(txn, "[redis_get] AUTH SUCCESS")
    end

    -- ==========================================================
    -- GET KEY
    -- ==========================================================
    local key = "room:" .. room_id
    local cmd = string.format("*2\r\n$3\r\nGET\r\n$%d\r\n%s\r\n", #key, key)
    sock:send(cmd)

    local line = sock:receive("*l")
    if not line then 
        sock:close()
        return nil 
    end

    -- Parse Response
    if line:sub(1,1) == "$" then
        local len = tonumber(line:sub(2))
        if len == -1 then 
            -- Key doesn't exist
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

core.register_action("route_ws", {"http-req"}, function(txn)
    local path = txn.sf:path()
    local room_id = path:match("^/ws/([%w]+)$")

    if not room_id then
        txn:set_var("txn.backend_name", "server0")
        return
    end

    -- Convert room_id to lowercase before handling any logic
    room_id = string.lower(room_id)

    -- Cache Check
    local now = core.now()
    local now_ms = (now.sec * 1000) + math.floor(now.usec / 1000)
    local cached = cache[room_id]
    if cached and cached.expiry > now_ms then
        log(txn, string.format("[route_ws] CACHE HIT %s -> %s", room_id, cached.backend))
        txn:set_var("txn.backend_name", cached.backend)
        return
    end

    -- Redis Lookup
    local backend = redis_get(txn, room_id) or "server0"
    
    -- Update Cache
    local ttl = 10000
    cache[room_id] = {
        backend = backend,
        expiry = now_ms + ttl
    }

    log(txn, string.format("[route_ws] FINAL DECISION: room %s -> %s", room_id, backend))
    txn:set_var("txn.backend_name", backend)
end)