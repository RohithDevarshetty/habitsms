#!/bin/sh
# Reads Bash tool input from stdin (JSON), runs build before git push
input=$(cat)
command=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

case "$command" in
  *"git push"*)
    echo "Pre-push: running build check..."
    npm run build --prefix /Users/rohith/Sync/habitsms
    ;;
esac
