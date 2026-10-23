#!/usr/bin/env bash
# Runs a build command; if it fails, the last lines of its output become a GitHub annotation
# (readable through the API without downloading the full log).
log=$(mktemp); "$@" 2>&1 | tee "$log"; code=${PIPESTATUS[0]}
if [ "$code" != 0 ]; then
  msg=$(grep -v '^\s*$' "$log" | tail -n 45 | sed 's/%/%25/g' | sed ':a;N;$!ba;s/\n/%0A/g')
  echo "::error title=$1 failed::$msg"
fi
exit "$code"
