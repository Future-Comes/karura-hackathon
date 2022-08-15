#!/bin/sh

echo DB_PORT=$DB_PORT >> .env
echo DB_HOST=$DB_HOST >> .env
echo DB_NAME=$DB_NAME >> .env
echo DB_PASS=$DB_PASS >> .env
echo GQL_PORT=$GQL_PORT >> .env
echo PROCESSOR_PROMETHEUS_PORT=$PROCESSOR_PROMETHEUS_PORT >> .env
