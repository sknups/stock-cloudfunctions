#!/usr/bin/env bash

FILENAME=$(basename "$ARCHIVE_FILE")
gsutil cp "$ARCHIVE_FILE" "gs://$BUILD_ARTIFACTS_BUCKET/$COMPONENT/$FILENAME"
