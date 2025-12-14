FROM haproxy:lts-trixie

# Copy config + Lua
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
COPY router.lua /usr/local/etc/haproxy/router.lua

# Render routes traffic to this port
EXPOSE 10000

# Run in foreground, log to stdout
CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg", "-db"] 