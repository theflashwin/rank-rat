package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"server/db"
	"server/handlers"

	"github.com/joho/godotenv"
)

// bindAddress resolves the TCP address the server should listen on.
func bindAddress() string {
	if port, ok := os.LookupEnv("PORT"); ok && port != "" {
		return fmt.Sprintf(":%s", port)
	}

	return ":3000"
}

func main() {
	// Load .env file (ignore error if file doesn't exist)
	if err := godotenv.Load(); err != nil {
		log.Printf("[server] No .env file found, using environment variables or defaults")
	}

	addr := bindAddress()

	// Parse port number for handlers
	portStr := os.Getenv("PORT")
	if portStr == "" {
		portStr = "3000"
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		log.Fatalf("[server] Invalid PORT value: %v", err)
	}

	// initalize the picture store
	picture_store, err := db.NewPictureStore()

	if err != nil {
		log.Fatalf("[server] [init] could not intialize picture stoer %v", err)
	}

	// Handlers
	http.HandleFunc("/ws/", handlers.Websocket(port, picture_store))
	http.HandleFunc("/get-traffic", handlers.TrafficResponse())

	log.Printf("[server] starting server on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
