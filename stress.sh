#!/usr/bin/env bash
URL=http://172.18.0.$1
ENDPOINT=/v1/users/jared

help() {
cat <<EOF
stress.sh 172.18.0.XXX

Examples:
  stress.sh 12
    tests 172.18.0.12
EOF
exit 0
}

if [[ -z "$1" ]]; then
  help
fi

loadtest -V c;1>/dev/null 2>/dev/null
if [[ $? -ne 0 ]]; then
  echo "couldn't find loadtest, attempting to install"
  npm install -g loadtest || echo "E: Failed to install 'loadtest' $(exit 1)"
fi

echo "Testing ${URL}${ENDPOINT} with 10 concurrent connections with 200 req/s"
loadtest -c 10 --rps 200 ${URL}${ENDPOINT}
