#!/bin/sh

echo "npm run start$VERSION"
npm run buildFrontend
npm run startBackend
