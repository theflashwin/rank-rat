package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"sink/db"
	"sink/handlers"
)

// bindAddress resolves the TCP address the server should listen on.
func bindAddress() string {
	if port, ok := os.LookupEnv("PORT"); ok && port != "" {
		return fmt.Sprintf(":%s", port)
	}

	return ":4001"
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Load .env file (ignore error if file doesn't exist)
	if err := godotenv.Load(); err != nil {
		log.Printf("[sink] No .env file found, using environment variables or defaults")
	}

	mux := http.NewServeMux()

	// Get configuration from environment variables
	redis_conn_string := os.Getenv("REDIS_CONN_STRING")
	if redis_conn_string == "" {
		log.Fatalf("[sink] REDIS_CONN_STRING environment variable is required")
	}

	postgres_conn_string := getEnv("POSTGRES_CONN_STRING", "postgres://dev:dev@localhost:5432/devdb?sslmode=disable")

	// create db connection
	conn, err := sql.Open("postgres", postgres_conn_string)

	if err != nil {
		log.Fatalf("[sink] could not connect to database: %v", err)
	}

	if err := conn.Ping(); err != nil {
		log.Fatalf("[sink] database ping failed: %v", err)
	}

	store := &db.GameStore{DB: conn}

	// create redis connection
	redis_store := db.NewRedisStore(redis_conn_string)

	// create s3 (pictures) connection
	picture_store, err := db.NewPictureStore()

	if err != nil {
		log.Fatalf("[sink] could not initialize picture store")
	}

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	mux.HandleFunc("/ws/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[sink] sent game not found error")
		http.Error(w, "game not found", http.StatusNotFound)
	})

	// game logic
	mux.Handle("/create-game", withCORS(handlers.CreateGameHandler(store, redis_store)))
	mux.Handle("/does-game-exist", withCORS(handlers.DoesGameExist(store)))
	mux.Handle("/generate-random-code", withCORS(handlers.CreateRandomCode(store)))

	// s3 picture presigning
	mux.Handle("/pictures/presign-upload", withCORS(handlers.PresignUploadHandler(picture_store)))

	// fetch game with presigned candidate images
	mux.Handle("/fetch-game/", withCORS(handlers.FetchGameHandler(store, picture_store)))

	addr := bindAddress()
	log.Printf("starting sink server on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
