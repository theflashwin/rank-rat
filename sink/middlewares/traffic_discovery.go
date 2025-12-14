package middlewares

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"
)

var gameServers map[string]string = map[string]string{
	"localhost:4000": "server1",
	"localhost:8000": "server2",
}

var ServerNotFound error = errors.New("[sink] [traffic discovery] could not get traffic of other servers")

type TrafficResponse struct {
	Data struct {
		NumConnections int `json:"num_connections"`
	} `json:"data"`
}

func GetLowestTrafficServer() (string, error) {

	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	var best_server string
	lowest_connections := math.MaxInt
	found := false

	for server_address, server_name := range gameServers {

		// ping server
		req := fmt.Sprintf("http://%s/get-traffic", server_address)
		resp, err := client.Get(req)

		if err != nil {
			return "", ServerNotFound
		}

		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			continue
		}

		var tr TrafficResponse
		if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
			continue
		}

		if tr.Data.NumConnections < lowest_connections {
			best_server = server_name
			lowest_connections = tr.Data.NumConnections
			found = true
		}

	}

	if !found {
		return "", ServerNotFound
	}

	return best_server, nil

}
