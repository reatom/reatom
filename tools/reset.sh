#! /bin/bash

rm -rf pnpm-lock.yaml
find . -name 'build' -type d -prune -print -exec rm -rf '{}' \;
find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
