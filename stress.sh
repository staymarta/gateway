#!/usr/bin/env bash
URL=http://172.18.0.$1
ENDPOINT=/v1/message

time curl -s $URL$ENDPOINT?[1-1000] > /dev/null
