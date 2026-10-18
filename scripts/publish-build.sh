#!/usr/bin/env bash
set -euo pipefail

# 把 dist/ 的构建产物推到远程 build 分支，并打印后台要填的地址。
# 用法：bash scripts/publish-build.sh
# 预演（不推送）：DRY_RUN=1 bash scripts/publish-build.sh

cd "$(dirname "$0")/.."
ROOT=$(pwd)

if [ ! -d dist ] || [ ! -f dist/index.html ]; then
  echo "缺少 dist/index.html，请先执行：npm install && npm run build"
  exit 1
fi

REMOTE=$(git config --get remote.origin.url)
if [ -z "$REMOTE" ]; then
  echo "没有配置 remote.origin.url，请先 git remote add origin <仓库地址>"
  exit 1
fi

SLUG=$(printf '%s' "$REMOTE" | sed -E 's#.*github\.com[:/](.*)#\1#; s#\.git$##')
NAME=$(git config --get user.name || true)
EMAIL=$(git config --get user.email || true)
NAME=${NAME:-BeacherZ}
EMAIL=${EMAIL:-BeacherZ@users.noreply.github.com}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cp -r dist/. "$TMP"/
cd "$TMP"
git init -q -b build
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -qm "chore: build dist"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[dry-run] 已生成提交，未推送：$(git rev-parse --short HEAD)"
  ls -1
  exit 0
fi

git push -f -q "$REMOTE" build
SHA=$(git rev-parse HEAD)

echo
echo "=============================================="
echo "构建产物已推送到 build 分支，后台请填这个地址："
echo
echo "  https://github.com/$SLUG/tree/$SHA"
echo
echo "并把根目录 CUSTOM-THEME-URL.txt 里的地址同步更新。"
echo "=============================================="
