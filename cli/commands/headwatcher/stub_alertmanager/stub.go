package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func main() {
	dir := os.Getenv("ALERTS_DIR")
	if dir == "" {
		fmt.Println("Environment variable ALERTS_DIR is not set")
		os.Exit(1)
	}

	http.HandleFunc("/api/v1/alerts", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()

		filename := fmt.Sprintf("%s.json", time.Now().Format("20060102_150405"))
		filepath := filepath.Join(dir, filename)

		if err := os.WriteFile(filepath, body, 0644); err != nil {
		    message := fmt.Sprintf("Failed to write file: %s", err.Error())
			http.Error(w, message, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Alert saved to %s\n", filepath)
	})

    port := ":41288"
	fmt.Printf("Starting server on port %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		fmt.Printf("Server failed: %s\n", err)
	}
}
