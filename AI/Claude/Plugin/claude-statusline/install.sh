#!/bin/bash
#
# Claude Code 상태 표시줄 설치 스크립트 (Mac/Linux)
#

set -e

# 색상 정의
RED='\033[91m'
GREEN='\033[92m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║   Claude Code 상태 표시줄 설치 (Mac/Linux)         ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# 스크립트 위치 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

# 1. jq 설치 확인
echo -e "${YELLOW}[1/4]${RESET} jq 설치 확인 중..."
if command -v jq &> /dev/null; then
    echo -e "  ${GREEN}✓${RESET} jq가 이미 설치되어 있습니다. ($(jq --version))"
else
    echo -e "  ${RED}✗${RESET} jq가 설치되어 있지 않습니다."
    echo ""
    echo -e "  ${YELLOW}jq 설치 방법:${RESET}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "    brew install jq"
    else
        echo "    sudo apt install jq  (Ubuntu/Debian)"
        echo "    sudo yum install jq  (CentOS/RHEL)"
    fi
    echo ""
    read -p "  jq 설치 후 계속하시겠습니까? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}설치가 취소되었습니다.${RESET}"
        exit 1
    fi
fi

# 2. .claude 디렉토리 생성
echo -e "${YELLOW}[2/4]${RESET} ~/.claude 디렉토리 확인 중..."
if [ -d "$CLAUDE_DIR" ]; then
    echo -e "  ${GREEN}✓${RESET} 디렉토리가 이미 존재합니다."
else
    mkdir -p "$CLAUDE_DIR"
    echo -e "  ${GREEN}✓${RESET} 디렉토리를 생성했습니다."
fi

# 3. 파일 복사
echo -e "${YELLOW}[3/4]${RESET} 설정 파일 복사 중..."

# settings.json 처리
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    echo -e "  ${YELLOW}!${RESET} 기존 settings.json 발견 - 백업 후 병합합니다."
    cp "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/settings.json.backup.$(date +%Y%m%d%H%M%S)"

    if command -v jq &> /dev/null; then
        jq -s '.[0] * .[1]' "$CLAUDE_DIR/settings.json" "$SCRIPT_DIR/settings-mac.json" > "$CLAUDE_DIR/settings.json.tmp"
        mv "$CLAUDE_DIR/settings.json.tmp" "$CLAUDE_DIR/settings.json"
        echo -e "  ${GREEN}✓${RESET} settings.json 병합 완료"
    else
        cp "$SCRIPT_DIR/settings-mac.json" "$CLAUDE_DIR/settings.json"
        echo -e "  ${GREEN}✓${RESET} settings.json 복사 완료"
    fi
else
    cp "$SCRIPT_DIR/settings-mac.json" "$CLAUDE_DIR/settings.json"
    echo -e "  ${GREEN}✓${RESET} settings.json 복사 완료"
fi

# statusline.sh 복사
cp "$SCRIPT_DIR/statusline.sh" "$CLAUDE_DIR/statusline.sh"
echo -e "  ${GREEN}✓${RESET} statusline.sh 복사 완료"

# 4. 실행 권한 부여
echo -e "${YELLOW}[4/4]${RESET} 실행 권한 설정 중..."
chmod +x "$CLAUDE_DIR/statusline.sh"
echo -e "  ${GREEN}✓${RESET} 실행 권한 부여 완료"

# 완료 메시지
echo ""
echo -e "${BOLD}${GREEN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║   ✓ 설치가 완료되었습니다!                        ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""
echo -e "설치 위치: ${BLUE}$CLAUDE_DIR${RESET}"
echo ""
echo -e "${YELLOW}상태 표시줄 예시:${RESET}"
echo -e "  [Opus] 컨텍스트: ${GREEN}████████${RESET}░░░░░░░░░░░░ ${GREEN}60% 남음${RESET} (80.0K/200K)"
echo ""
echo -e "${YELLOW}색상 기준:${RESET}"
echo -e "  ${GREEN}■${RESET} 0~49%   : 여유 있음"
echo -e "  ${YELLOW}■${RESET} 50~79%  : 주의"
echo -e "  ${RED}■${RESET} 80~99%  : 경고"
echo -e "  ${RED}■${RESET} 100%+   : 압축됨"
echo ""
echo -e "${BOLD}Claude Code를 재시작하면 적용됩니다.${RESET}"
echo ""
