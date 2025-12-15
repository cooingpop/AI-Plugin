#!/bin/bash
# Claude Code 컨텍스트 윈도우 상태 표시줄

input=$(cat)

# JSON 파싱
INPUT_TOKENS=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
OUTPUT_TOKENS=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
MODEL=$(echo "$input" | jq -r '.model.display_name // "Claude"')

# 토큰 계산
TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))
PERCENT_USED=$((TOTAL_TOKENS * 100 / CONTEXT_SIZE))
REMAINING_PERCENT=$((100 - PERCENT_USED))

# K 단위 변환
TOTAL_K=$(awk "BEGIN {printf \"%.1f\", $TOTAL_TOKENS/1000}")
MAX_K=$(awk "BEGIN {printf \"%.0f\", $CONTEXT_SIZE/1000}")

# ANSI 색상
RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
DIM='\033[2m'

# 사용량에 따른 색상 결정
if [ "$PERCENT_USED" -ge 100 ]; then
    COLOR=$RED
    STATUS_TEXT="압축됨"
elif [ "$PERCENT_USED" -ge 80 ]; then
    COLOR=$RED
    STATUS_TEXT="${REMAINING_PERCENT}% 남음"
elif [ "$PERCENT_USED" -ge 50 ]; then
    COLOR=$YELLOW
    STATUS_TEXT="${REMAINING_PERCENT}% 남음"
else
    COLOR=$GREEN
    STATUS_TEXT="${REMAINING_PERCENT}% 남음"
fi

# 진행률 바 생성 (20칸)
BAR_WIDTH=20
if [ "$PERCENT_USED" -gt 100 ]; then
    FILLED=$BAR_WIDTH
else
    FILLED=$((PERCENT_USED * BAR_WIDTH / 100))
fi
EMPTY=$((BAR_WIDTH - FILLED))

# 바 문자 생성
BAR_FILLED=$(printf '█%.0s' $(seq 1 $FILLED 2>/dev/null) || echo "")
BAR_EMPTY=$(printf '░%.0s' $(seq 1 $EMPTY 2>/dev/null) || echo "")

# 빈 바 처리
[ "$FILLED" -eq 0 ] && BAR_FILLED=""
[ "$EMPTY" -eq 0 ] && BAR_EMPTY=""

# 출력
echo -e "${BOLD}[${MODEL}]${RESET} 컨텍스트: ${COLOR}${BAR_FILLED}${DIM}${BAR_EMPTY}${RESET} ${COLOR}${STATUS_TEXT}${RESET} ${DIM}(${TOTAL_K}K/${MAX_K}K)${RESET}"
