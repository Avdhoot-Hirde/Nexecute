#!/bin/sh
set -eu
file="$2"
source="/source/$file"
case "$1" in
  python) exec python3 -u "$source" ;;
  javascript) exec node --max-old-space-size=128 "$source" ;;
  typescript)
    NODE_OPTIONS=--max-old-space-size=128 tsc --target ES2020 --module commonjs --skipLibCheck --outDir /work "$source" </dev/null
    exec node --max-old-space-size=128 "/work/${file%.ts}.js" ;;
  ruby) exec ruby -e 'STDOUT.sync = true; load ARGV[0]' "$source" ;;
  php) exec php -d memory_limit=128M "$source" ;;
  c)
    gcc -std=c17 -O0 "$source" -o /work/solution
    exec /work/solution ;;
  go)
    GOTMPDIR=/work GOCACHE=/work/go-cache GOPATH=/work/go GO111MODULE=off GOPROXY=off GOMAXPROCS=1 GOMEMLIMIT=96MiB go build -p 1 -o /work/solution "$source"
    exec /work/solution ;;
  rust)
    rustc --edition=2021 --crate-name solution "$source" -o /work/solution
    exec /work/solution ;;
  java)
    javac -J-Xmx96m -J-XX:ActiveProcessorCount=1 -d /work "$source"
    exec java -Xmx96m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxMetaspaceSize=64m -cp /work "${file%.java}" ;;
  cpp)
    g++ -std=c++17 -O0 "$source" -o /work/solution
    exec /work/solution ;;
  *) echo "Unsupported language" >&2; exit 2 ;;
esac
