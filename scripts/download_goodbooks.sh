#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data/goodbooks"

mkdir -p "$DATA_DIR"

curl -L "https://raw.githubusercontent.com/malcolmosh/goodbooks-10k-extended/master/books_enriched.csv" -o "$DATA_DIR/books_enriched.csv"
curl -L "https://raw.githubusercontent.com/zygmuntz/goodbooks-10k/master/ratings.csv" -o "$DATA_DIR/ratings.csv"

echo "Downloaded Goodbooks dataset files to $DATA_DIR"
