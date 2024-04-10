#!/usr/bin/env bash

common_args="--project drm-apps-01-43b0"
common_args="${common_args} --trigger-http"
common_args="${common_args} --region=europe-west2"
common_args="${common_args} --security-level=secure-always"
common_args="${common_args} --runtime=nodejs18"
common_args="${common_args} --vpc-connector=vpc-ac-europe-west2"
common_args="${common_args} --set-env-vars REDIS_HOST=10.66.0.11,REDIS_PORT=6378,REDIS_TLS=true,REDIS_DB=0"
common_args="${common_args} --set-secrets REDIS_PASSWORD=REDIS_PASSWORD:latest"
common_args="${common_args} --service-account=stock-cf-read@drm-apps-01-43b0.iam.gserviceaccount.com"
common_args="${common_args} --memory=512MB"
common_args="${common_args} --set-build-env-vars GOOGLE_NODE_RUN_SCRIPTS="

npm run compile

name=stock-save-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name"  \
    "$common_args" \
    --entry-point=save 
fi

name=stock-get-all-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name"  \
    "$common_args" \
    --entry-point=getAll 
fi

name=stock-get-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name"  \
    "$common_args" \
    --entry-point=get 
fi

name=stock-update-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name" \
    "$common_args" \
    --entry-point=update 
fi

name=stock-create-issue-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name" \
    "$common_args" \
    --entry-point=createIssue 
fi

name=stock-delete-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name" \
    "$common_args" \
    --entry-point=deleteStock 
fi


name=stock-update-all-tmp
if [[ -z "$1" || "$1" == "$name" ]]; then
  gcloud functions deploy "$name" \
    "$common_args" \
    --entry-point=updateAll 
fi