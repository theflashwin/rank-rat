package db

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	Client *redis.Client
}

func NewRedisStore() (*RedisStore, error) {
	// Get Redis connection details from environment variables
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		return nil, fmt.Errorf("REDIS_ADDR environment variable is required")
	}

	username := os.Getenv("REDIS_USERNAME")
	password := os.Getenv("REDIS_PASSWORD")
	if password == "" {
		return nil, fmt.Errorf("REDIS_PASSWORD environment variable is required")
	}

	dbStr := os.Getenv("REDIS_DB")
	db := 0
	if dbStr != "" {
		var err error
		db, err = strconv.Atoi(dbStr)
		if err != nil {
			return nil, fmt.Errorf("REDIS_DB must be a valid integer: %w", err)
		}
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Username: username,
		Password: password,
		DB:       db,
	})

	// Test the connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisStore{Client: rdb}, nil
}

// SetRoomServer maps a room ID to a backend server name (no TTL).
// Key shape: room:<roomID> → serverName
func (s *RedisStore) SetRoomServer(ctx context.Context, roomID, serverName string) error {
	if s == nil || s.Client == nil {
		return fmt.Errorf("redis store not configured")
	}
	if roomID == "" || serverName == "" {
		return fmt.Errorf("roomID and serverName are required")
	}

	key := fmt.Sprintf("room:%s", roomID)
	if err := s.Client.Set(ctx, key, serverName, 0).Err(); err != nil {
		return fmt.Errorf("redis SET failed: %w", err)
	}

	return nil
}
