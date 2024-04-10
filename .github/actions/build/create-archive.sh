#!/usr/bin/env bash

mkdir build
cp -a ./dist ./build
cp package*.json ./build
cp .npmrc ./build
cd build || exit
zip -r "../${VERSION}.zip" .
ARCHIVE_FILE=$(readlink -f "../${VERSION}".zip)
echo "archive_file=$ARCHIVE_FILE" >> "$GITHUB_OUTPUT"

