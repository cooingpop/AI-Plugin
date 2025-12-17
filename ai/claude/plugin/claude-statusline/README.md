# Claude Code 상태 표시줄 설정 (Windows)

컨텍스트 윈도우 사용량을 시각적으로 보여주는 상태 표시줄입니다.

## 특징

- **토큰을 사용하지 않습니다** - API 호출 없이 로컬에서만 동작합니다.

## 동작 원리

Claude Code가 제공하는 환경변수(`CLAUDE_CONTEXT_WINDOW_TOKENS_USED`, `CLAUDE_CONTEXT_WINDOW_TOKEN_LIMIT`, `CLAUDE_MODEL_NAME`)를 읽어서 터미널에 표시합니다.

---

## 미리보기

```
[Opus] Context: ████░░░░░░░░░░░░░░░░ 80% left (40.0K/200K)
[Opus] Context: ██████████░░░░░░░░░░ 50% left (100.0K/200K)
[Opus] Context: ████████████████░░░░ 20% left (160.0K/200K)
[Opus] Context: ████████████████████ compressed (210.0K/200K)
```

### 색상 기준

| 사용량 | 색상 | 상태 |
|--------|------|------|
| 0~49%  | 🟢 초록 | 여유 있음 |
| 50~79% | 🟡 노랑 | 주의 |
| 80~99% | 🔴 빨강 | 경고 |
| 100%+  | 🔴 빨강 | compressed |

---

## 파일 구조

```
claude-statusline/
├── install.bat           # 설치 스크립트
├── settings-windows.json # 설정 파일
├── statusline.ps1        # 상태 표시줄 (PowerShell)
└── README.md             # 이 파일
```

---

## 설치

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

## 수동 설치

```cmd
mkdir %USERPROFILE%\.claude
copy settings-windows.json %USERPROFILE%\.claude\settings.json
copy statusline.ps1 %USERPROFILE%\.claude\statusline.ps1
```

---

## 문제 해결

**상태 표시줄이 안 보여요**
1. PowerShell 버전 확인: `$PSVersionTable.PSVersion`
2. 실행 정책 확인: `Get-ExecutionPolicy`
3. Claude Code 재시작

**색상이 안 나와요**
- Windows Terminal 사용 권장 (기본 CMD는 ANSI 색상 제한)

---

## 커스터마이징

### 바 길이 변경

`statusline.ps1` 파일에서:
```powershell
$barWidth = 20  # 원하는 길이로 변경
```

### 색상 임계값 변경

`statusline.ps1` 파일에서:
```powershell
if ($percentUsed -ge 100) { ... }
elseif ($percentUsed -ge 80) { ... }   # 여기 숫자 변경
elseif ($percentUsed -ge 50) { ... }   # 여기 숫자 변경
```

---

## 제거 방법

```cmd
del %USERPROFILE%\.claude\statusline.ps1
```
`settings.json`에서 `statusLine` 항목 삭제
