docker-compose build
docker-compose pull
docker ps -a
docker-compose up -d zookeeper kafka
docker-compose up --exit-code-from=subscriptions-test subscriptions-test
