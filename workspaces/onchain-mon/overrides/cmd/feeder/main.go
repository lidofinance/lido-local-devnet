package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/sync/errgroup"

	"github.com/lidofinance/onchain-mon/internal/app/feeder"
	"github.com/lidofinance/onchain-mon/internal/app/server"
	"github.com/lidofinance/onchain-mon/internal/connectors/logger"
	"github.com/lidofinance/onchain-mon/internal/connectors/metrics"
	nc "github.com/lidofinance/onchain-mon/internal/connectors/nats"
	"github.com/lidofinance/onchain-mon/internal/env"
	"github.com/lidofinance/onchain-mon/internal/pkg/chain"
)

const maxMsgSize = 4 * 1024 * 1024 // 4 Mb

func isSubjectsOverlapError(err error) bool {
	return strings.Contains(err.Error(), "subjects overlap with an existing stream")
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGINT, syscall.SIGKILL)
	defer stop()
	g, gCtx := errgroup.WithContext(ctx)

	cfg, envErr := env.Read("")
	if envErr != nil {
		fmt.Println("Read env error:", envErr.Error())
		return
	}

	log, sentryClient, logErr := logger.New(&cfg.AppConfig)
	if logErr != nil {
		fmt.Println("New log error:", logErr.Error())
		return
	}
	if sentryClient != nil {
		defer sentryClient.Flush(2 * time.Second)
	}

	natsClient, natsErr := nc.New(&cfg.AppConfig, log)
	if natsErr != nil {
		log.Error(fmt.Sprintf(`Could not connect to nats error: %v`, natsErr))
		return
	}
	defer natsClient.Close()
	log.Info("Nats connected")

	js, jetStreamErr := jetstream.New(natsClient)
	if jetStreamErr != nil {
		fmt.Println("Could not connect to jetStream error:", jetStreamErr.Error())
		return
	}
	log.Info("Nats jetStream connected")

	streamName := "FeederBlockStream"
	_, streamErr := js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:       streamName,
		Discard:    jetstream.DiscardOld,
		MaxAge:     10 * time.Minute,
		Subjects:   []string{cfg.AppConfig.BlockTopic},
		MaxMsgSize: maxMsgSize,
		Retention:  jetstream.InterestPolicy,
	})
	if streamErr != nil &&
		!errors.Is(streamErr, nats.ErrStreamNameAlreadyInUse) &&
		!isSubjectsOverlapError(streamErr) {
		fmt.Printf("could not create %s stream error: %v\n", streamName, streamErr)
		return
	}
	if isSubjectsOverlapError(streamErr) {
		log.Warn(fmt.Sprintf(
			"%s subject already managed by another stream, continuing with existing stream: %v",
			streamName,
			streamErr,
		))
	} else {
		log.Info(fmt.Sprintf("%s jetStream createdOrUpdated", streamName))
	}

	r := chi.NewRouter()
	metricsStore := metrics.New(prometheus.NewRegistry(), cfg.AppConfig.MetricsPrefix, cfg.AppConfig.Name, cfg.AppConfig.Env)

	transport := &http.Transport{
		MaxIdleConns:          10,
		MaxIdleConnsPerHost:   5,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}

	chainSrv := chain.NewChain(cfg.AppConfig.JsonRpcURL, httpClient, metricsStore)
	app := server.New(&cfg.AppConfig, nil, log, metricsStore, js, natsClient)

	app.Metrics.BuildInfo.Inc()

	feederWrk := feeder.New(log, chainSrv, js, metricsStore, cfg.AppConfig.BlockTopic)
	feederWrk.Run(gCtx, g)

	app.RegisterWorkerRoutes(r)
	app.RegisterInfraRoutes(r)
	app.RunHTTPServer(gCtx, g, cfg.AppConfig.Port, r)

	log.Info(fmt.Sprintf(`Started %s`, cfg.AppConfig.Name))

	if err := g.Wait(); err != nil {
		log.Error(err.Error())
	}

	log.Info(fmt.Sprintf(`Main done %s`, cfg.AppConfig.Name))
}
