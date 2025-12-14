package db

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"
)

type RedisStore struct {
	Addr string
}

func NewRedisStore(addr string) *RedisStore {
	if strings.TrimSpace(addr) == "" {
		panic("Redis address cannot be empty")
	}

	// Parse connection string - handle both "redis://host:port" and "host:port" formats
	parsedAddr := addr
	if strings.HasPrefix(addr, "redis://") || strings.HasPrefix(addr, "rediss://") {
		u, err := url.Parse(addr)
		if err != nil {
			panic(fmt.Sprintf("Invalid Redis connection string: %v", err))
		}
		// Extract host:port from URL
		if u.Port() != "" {
			parsedAddr = fmt.Sprintf("%s:%s", u.Hostname(), u.Port())
		} else {
			parsedAddr = u.Hostname() + ":6379" // Default Redis port
		}
	}

	return &RedisStore{Addr: parsedAddr}
}

// SetRoomServer maps a room ID to a backend server name (no TTL).
// Key shape: room:<roomID> → serverName
func (s *RedisStore) SetRoomServer(ctx context.Context, roomID, serverName string) error {
	if s == nil {
		return fmt.Errorf("redis store not configured")
	}
	if roomID == "" || serverName == "" {
		return fmt.Errorf("roomID and serverName are required")
	}

	dialer := &net.Dialer{Timeout: 2 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", s.Addr)
	if err != nil {
		return fmt.Errorf("dial redis: %w", err)
	}
	defer conn.Close()

	key := fmt.Sprintf("room:%s", roomID)

	var builder strings.Builder
	// SET key value (no TTL)
	builder.WriteString("*3\r\n")
	builder.WriteString("$3\r\nSET\r\n")
	builder.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(key), key))
	builder.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(serverName), serverName))

	if _, err := conn.Write([]byte(builder.String())); err != nil {
		return fmt.Errorf("write redis command: %w", err)
	}

	if err := conn.SetReadDeadline(time.Now().Add(2 * time.Second)); err != nil {
		return fmt.Errorf("set read deadline: %w", err)
	}

	reader := bufio.NewReader(conn)
	line, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("read redis response: %w", err)
	}

	if !strings.HasPrefix(line, "+OK") {
		return fmt.Errorf("redis returned error: %s", strings.TrimSpace(line))
	}

	return nil
}
