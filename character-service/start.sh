#!/bin/sh
# TorchServe (detector + pose models) runs in the background on :8080; Flask serves /animate on :5000.
set -e
torchserve --start --disable-token-auth --ncs \
    --ts-config /home/torchserve/config.properties --model-store /home/torchserve/model-store
exec python /app/server.py
