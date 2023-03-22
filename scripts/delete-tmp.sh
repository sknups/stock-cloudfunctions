#!/usr/bin/env bash

common_args="--project=drm-apps-01-43b0 --region=europe-west2 --quiet"

gcloud functions delete stock-save-tmp $common_args
gcloud functions delete stock-get-all-tmp $common_args
gcloud functions delete stock-get-tmp $common_args
gcloud functions delete stock-update-tmp $common_args
gcloud functions delete stock-create-issue-tmp $common_args
gcloud functions delete stock-update-issued-tmp $common_args
gcloud functions delete stock-delete-tmp $common_args
