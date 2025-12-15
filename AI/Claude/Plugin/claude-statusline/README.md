# Claude Code 상태 표시줄 설정

컨텍스트 윈도우 사용량을 시각적으로 보여주는 상태 표시줄입니다.

## 미리보기

### Windows
```
[Opus] Context: ████░░░░░░░░░░░░░░░░ 80% left (40.0K/200K)
[Opus] Context: ██████████░░░░░░░░░░ 50% left (100.0K/200K)
[Opus] Context: ████████████████░░░░ 20% left (160.0K/200K)
[Opus] Context: ████████████████████ compressed (210.0K/200K)
```

### Mac / Linux
```
[Opus] 컨텍스트: ████░░░░░░░░░░░░░░░░ 80% 남음 (40.0K/200K)
[Opus] 컨텍스트: ██████████░░░░░░░░░░ 50% 남음 (100.0K/200K)
[Opus] 컨텍스트: ████████████████░░░░ 20% 남음 (160.0K/200K)
[Opus] 컨텍스트: ████████████████████ 압축됨 (210.0K/200K)
```

### 색상 기준

| 사용량 | 색상 | 상태 (Windows / Mac) |
|--------|------|----------------------|
| 0~49%  | 🟢 초록 | 여유 있음 |
| 50~79% | 🟡 노랑 | 주의 |
| 80~99% | 🔴 빨강 | 경고 |
| 100%+  | 🔴 빨강 | compressed / 압축됨 |

---

## 파일 구조

```
claude-statusline/
├── install.bat           # Windows 설치 스크립트
├── install.sh            # Mac/Linux 설치 스크립트
├── settings-windows.json # Windows용 설정
├── settings-mac.json     # Mac/Linux용 설정
├── statusline.ps1        # Windows용 상태 표시줄 (PowerShell)
├── statusline.sh         # Mac/Linux용 상태 표시줄 (Bash)
└── README.md             # 이 파일
```

---

## 🪟 Windows 설치

### 방법 1: 더블클릭 (권장)
1. `install.bat` 파일을 더블클릭
2. 설치 완료 메시지 확인
3. Claude Code 재시작

### 방법 2: 명령 프롬프트
```cmd
cd claude-statusline
install.bat
```

### 요구사항
- Windows PowerShell (기본 설치됨)
- 추가 설치 필요 없음!

---

## 🍎 Mac / Linux 설치

### 방법 1: 터미널
```bash
cd claude-statusline
chmod +x install.sh
./install.sh
```

### 방법 2: 한 줄 실행
```bash
bash claude-statusline/install.sh
```

### 요구사항
- `jq` 설치 필요

```bash
# Mac (Homebrew)
brew install jq

# Ubuntu / Debian
sudo apt install jq

# CentOS / RHEL
sudo yum install jq
```

---

## 수동 설치

### Windows
```cmd
mkdir %USERPROFILE%\.claude
copy settings-windows.json %USERPROFILE%\.claude\settings.json
copy statusline.ps1 %USERPROFILE%\.claude\statusline.ps1
```

### Mac / Linux
```bash
mkdir -p ~/.claude
cp settings-mac.json ~/.claude/settings.json
cp statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
```

---

## 문제 해결

### Windows

**상태 표시줄이 안 보여요**
1. PowerShell 버전 확인: `$PSVersionTable.PSVersion`
2. 실행 정책 확인: `Get-ExecutionPolicy`
3. Claude Code 재시작

**색상이 안 나와요**
- Windows Terminal 사용 권장 (기본 CMD는 ANSI 색상 제한)

### Mac / Linux

**상태 표시줄이 안 보여요**
1. `jq` 설치 확인: `jq --version`
2. 실행 권한 확인: `ls -la ~/.claude/statusline.sh`
3. Claude Code 재시작

---

## 커스터마이징

### 바 길이 변경

**Windows** (`statusline.ps1`)
```powershell
$barWidth = 20  # 원하는 길이로 변경
```

**Mac** (`statusline.sh`)
```bash
BAR_WIDTH=20  # 원하는 길이로 변경
```

### 색상 임계값 변경

**Windows** (`statusline.ps1`)
```powershell
if ($percentUsed -ge 100) { ... }
elseif ($percentUsed -ge 80) { ... }   # 여기 숫자 변경
elseif ($percentUsed -ge 50) { ... }   # 여기 숫자 변경
```

**Mac** (`statusline.sh`)
```bash
if [ "$PERCENT_USED" -ge 100 ]; then ...
elif [ "$PERCENT_USED" -ge 80 ]; then ...  # 여기 숫자 변경
elif [ "$PERCENT_USED" -ge 50 ]; then ...  # 여기 숫자 변경
```

---

## 제거 방법

### Windows
```cmd
del %USERPROFILE%\.claude\statusline.ps1
```
`settings.json`에서 `statusLine` 항목 삭제

### Mac / Linux
```bash
rm ~/.claude/statusline.sh
```
`settings.json`에서 `statusLine` 항목 삭제
