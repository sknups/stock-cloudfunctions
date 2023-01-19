# item-cloudfunctions
Cloud functions related to stock

## Local development

To execute locally, you will need:

* nvm
* Nodejs 16.x
* npm 8.x
* Google Cloud CLI
  * Install (https://cloud.google.com/sdk/docs/install-sdk)
  * Authorization to access the development project 
  * docker 20.10.9 (used for running development redis)
  * docker-compose 1.29.2 (used for running development redis)

### Install Dependencies

```bash
npm ci
```

### Set env file

Create a `.env` file for dev, eg:

```bash
cat <<EOF > .env
GCLOUD_PROJECT=local
REDIS_HOST=localhost
EOF
```

### Start Redis

Project includes a docker-compose.yml file that can be used to launch a redis server for development.

```
docker-compose up -d
```

### Development Server

The following command will start a local development server. The server will reload when source files are changed.

```
npm start
```

The cloud functions can now be accessed locally at `http://localhost:8080/stock-<function>`.

### Unit Testing

The unit tests can be run using the following command.

```bash
npm test
```

## Functions

### stock-create

```bash
curl -X POST \
     -H 'Content-Type: application/json' \
     http://localhost:8080/stock-create -d '{"sku":"SKU_0001","operation":"CREATE","maxQty":123}'
```

### stock-get

```bash
curl http://localhost:8080/stock-get/SKU_0001
```

### stock-get-all

```bash
curl http://localhost:8080/stock-get-all
```

### stock-delete-all

```bash
curl -X DELETE http://localhost:8080/stock-delete-all
```

### stock-update

```bash
curl -X PUT http://localhost:8080/stock-update/SKU_0001
```

## Test GCP Deployment

Deploy functions with `-tmp` suffix:

```bash
npm run deploy
```

Delete functions with `-tmp` suffix:

```bash
npm run delete
```