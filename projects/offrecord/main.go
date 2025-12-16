package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/eiannone/keyboard"
)

type Client struct {
	conn     net.Conn
	nickname string
}

var (
	clients    = make(map[net.Conn]*Client)
	clientsMux sync.RWMutex
	broadcast  = make(chan string, 100)
	myNickname string
)

func getLocalIP() string {
	addrs, _ := net.InterfaceAddrs()
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			ip := ipnet.IP.To4()
			if ip != nil {
				// 169.254.x.x (APIPA) 주소 제외
				if ip[0] == 169 && ip[1] == 254 {
					continue
				}
				return ip.String()
			}
		}
	}
	return "Unknown"
}

func showMenu(selected int) {
	myIP := getLocalIP()
	clearScreen()

	// ASCII Art
	fmt.Println("         __  __                            _ ")
	fmt.Println("  ___   / _|/ _|_ __ ___  ___ ___  _ __ __| |")
	fmt.Println(" / _ \\ | |_| |_| '__/ _ \\/ __/ _ \\| '__/ _` |")
	fmt.Println("| (_) ||  _|  _| | |  __/ (_| (_) | | | (_| |")
	fmt.Println(" \\___/ |_| |_| |_|  \\___|\\___\\___/|_|  \\__,_|")
	fmt.Println()
	fmt.Println("        anonymous chat system")
	fmt.Println()

	menus := []string{
		fmt.Sprintf("방 만들기  [IP: %s]", myIP),
		"방 접속하기",
		"종료",
	}

	for i, menu := range menus {
		if i == selected {
			fmt.Printf("  > %s\n", menu)
		} else {
			fmt.Printf("    %s\n", menu)
		}
	}

	fmt.Println()
	fmt.Println("  [↑↓] 선택  [Enter] 확인")
}

func main() {
	// Ctrl+C 무시
	signal.Ignore(syscall.SIGINT)

	for {
		runMainMenu()
	}
}

func runMainMenu() {
	if err := keyboard.Open(); err != nil {
		// 이미 열려있으면 닫고 다시 열기
		keyboard.Close()
		if err := keyboard.Open(); err != nil {
			panic(err)
		}
	}

	selected := 0
	showMenu(selected)

	for {
		_, key, err := keyboard.GetKey()
		if err != nil {
			keyboard.Close()
			return
		}

		switch key {
		case keyboard.KeyArrowUp:
			if selected > 0 {
				selected--
			}
			showMenu(selected)
		case keyboard.KeyArrowDown:
			if selected < 2 {
				selected++
			}
			showMenu(selected)
		case keyboard.KeyEnter:
			keyboard.Close()
			reader := bufio.NewReader(os.Stdin)
			switch selected {
			case 0:
				runServer(reader)
			case 1:
				runClient(reader)
			case 2:
				clearScreen()
				fmt.Println("프로그램을 종료합니다.")
				os.Exit(0)
			}
			return
		case keyboard.KeyEsc:
			clearScreen()
			fmt.Println("프로그램을 종료합니다.")
			os.Exit(0)
		}
	}
}

func clearScreen() {
	fmt.Print("\033[H\033[2J\033[3J")
}

func isPortAvailable(port string) bool {
	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

func findAvailablePort(startPort int) string {
	for port := startPort; port < startPort+100; port++ {
		if isPortAvailable(fmt.Sprintf("%d", port)) {
			return fmt.Sprintf("%d", port)
		}
	}
	return ""
}

func getTimeStamp() string {
	return time.Now().Format("15:04")
}

func printInputLine() {
	// 블라인드 테스트를 위해 프롬프트 없이 출력
}

// ==================== 서버 (호스트) 모드 ====================

func runServer(reader *bufio.Reader) {
	clearScreen()

	// 닉네임 입력
	fmt.Print("닉네임을 입력하세요: ")
	nickname, _ := reader.ReadString('\n')
	myNickname = strings.TrimSpace(nickname)
	if myNickname == "" {
		myNickname = fmt.Sprintf("익명%d", time.Now().UnixNano()%1000)
	}

	// 사용 가능한 포트 찾기
	defaultPort := "9000"
	if !isPortAvailable(defaultPort) {
		availablePort := findAvailablePort(9000)
		if availablePort != "" {
			fmt.Printf("  ⚠ 9000 포트 사용중 → %s 사용 가능\n\n", availablePort)
			defaultPort = availablePort
		}
	}

	// 포트 입력
	fmt.Printf("포트 번호 (기본값 %s): ", defaultPort)
	portInput, _ := reader.ReadString('\n')
	port := strings.TrimSpace(portInput)
	if port == "" {
		port = defaultPort
	}

	var err error
	hostListener, err = net.Listen("tcp", ":"+port)
	if err != nil {
		fmt.Printf("\n서버 시작 실패: %v\n", err)
		availablePort := findAvailablePort(9000)
		if availablePort != "" {
			fmt.Printf("사용 가능한 포트: %s\n", availablePort)
		}
		fmt.Print("\n아무 키나 누르면 메뉴로 돌아갑니다...")
		reader.ReadByte()
		return
	}
	defer hostListener.Close()

	printHostHeader()

	// 브로드캐스트 고루틴
	go handleBroadcast()

	// 호스트 입력 처리 고루틴
	go handleHostInput()

	// 클라이언트 연결 수락
	for {
		conn, err := hostListener.Accept()
		if err != nil {
			// 리스너가 닫혔으면 루프 탈출
			return
		}
		go handleClient(conn)
	}
}

func handleBroadcast() {
	for msg := range broadcast {
		clientsMux.RLock()
		for conn := range clients {
			conn.Write([]byte(msg + "\n"))
		}
		clientsMux.RUnlock()
	}
}

func handleHostInput() {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			printInputLine()
			continue
		}

		if strings.HasPrefix(input, "/") {
			if handleHostCommand(input) {
				return
			}
			printInputLine()
		} else {
			// 호스트 메시지 브로드캐스트
			timestamp := getTimeStamp()
			msg := fmt.Sprintf("[%s] %s: %s", timestamp, myNickname, input)
			fmt.Printf("\033[1A\033[K%s\n", msg)
			broadcast <- msg
			printInputLine()
		}
	}
}

var hostListener net.Listener

func printHostHeader() {
	clearScreen()
	fmt.Println("         __  __                            _ ")
	fmt.Println("  ___   / _|/ _|_ __ ___  ___ ___  _ __ __| |")
	fmt.Println(" / _ \\ | |_| |_| '__/ _ \\/ __/ _ \\| '__/ _` |")
	fmt.Println("| (_) ||  _|  _| | |  __/ (_| (_) | | | (_| |")
	fmt.Println(" \\___/ |_| |_| |_|  \\___|\\___\\___/|_|  \\__,_|")
	fmt.Println()
	fmt.Println("  /l 접속자  /k 강퇴  /c 클리어  /m 메뉴  /q 종료")
	fmt.Println()
	printInputLine()
}

func handleHostCommand(cmd string) bool {
	parts := strings.Fields(cmd)
	switch parts[0] {
	case "/clear", "/c":
		printHostHeader()
		return false

	case "/list", "/l":
		fmt.Println("\n━━━ 접속자 목록 ━━━")
		fmt.Printf("  - %s\n", myNickname)
		clientsMux.RLock()
		for _, client := range clients {
			fmt.Printf("  - %s\n", client.nickname)
		}
		clientsMux.RUnlock()
		fmt.Println("━━━━━━━━━━━━━━━━━━")

	case "/kick", "/k":
		if len(parts) < 2 {
			fmt.Println("사용법: /kick 닉네임")
			return false
		}
		nickname := parts[1]
		clientsMux.Lock()
		for conn, client := range clients {
			if client.nickname == nickname {
				conn.Write([]byte("호스트에 의해 강제 퇴장되었습니다.\n"))
				conn.Close()
				delete(clients, conn)
				broadcast <- fmt.Sprintf("*** %s 님이 강제 퇴장되었습니다 ***", nickname)
				fmt.Printf("%s 강제 퇴장 완료\n", nickname)
				clientsMux.Unlock()
				return false
			}
		}
		clientsMux.Unlock()
		fmt.Printf("'%s' 닉네임을 찾을 수 없습니다\n", nickname)

	case "/menu", "/m":
		fmt.Println("메인 메뉴로 돌아갑니다...")
		broadcast <- "*** 호스트가 방을 닫았습니다 ***"
		time.Sleep(500 * time.Millisecond)
		// 모든 클라이언트 연결 종료
		clientsMux.Lock()
		for conn := range clients {
			conn.Close()
		}
		clients = make(map[net.Conn]*Client)
		clientsMux.Unlock()
		if hostListener != nil {
			hostListener.Close()
		}
		return true

	case "/quit", "/q":
		fmt.Println("프로그램을 종료합니다...")
		broadcast <- "*** 호스트가 방을 닫았습니다 ***"
		time.Sleep(500 * time.Millisecond)
		os.Exit(0)

	default:
		fmt.Println("알 수 없는 명령어. /l /k /c /m /q")
	}
	return false
}

func handleClient(conn net.Conn) {
	defer conn.Close()

	// 닉네임 요청
	conn.Write([]byte("NICK_REQUEST\n"))
	scanner := bufio.NewScanner(conn)

	if !scanner.Scan() {
		return
	}
	nickname := strings.TrimSpace(scanner.Text())
	if nickname == "" {
		nickname = fmt.Sprintf("익명%d", time.Now().UnixNano()%1000)
	}

	// 클라이언트 등록
	client := &Client{conn: conn, nickname: nickname}
	clientsMux.Lock()
	clients[conn] = client
	clientsMux.Unlock()

	// 입장 알림
	joinMsg := fmt.Sprintf("[%s] *** %s 님이 입장했습니다 ***", getTimeStamp(), nickname)
	fmt.Printf("\033[2K\r%s\n", joinMsg)
	printInputLine()
	broadcast <- joinMsg

	// 메시지 수신
	for scanner.Scan() {
		msg := strings.TrimSpace(scanner.Text())
		if msg == "" {
			continue
		}

		if msg == "/quit" || msg == "/q" {
			break
		}

		if msg == "/list" || msg == "/l" {
			clientsMux.RLock()
			conn.Write([]byte("━━━ 접속자 목록 ━━━\n"))
			conn.Write([]byte(fmt.Sprintf("  - %s\n", myNickname)))
			for _, c := range clients {
				conn.Write([]byte(fmt.Sprintf("  - %s\n", c.nickname)))
			}
			conn.Write([]byte("━━━━━━━━━━━━━━━━━━\n"))
			clientsMux.RUnlock()
			continue
		}

		timestamp := getTimeStamp()
		fullMsg := fmt.Sprintf("[%s] %s: %s", timestamp, nickname, msg)
		fmt.Printf("\033[2K\r%s\n", fullMsg)
		printInputLine()
		broadcast <- fullMsg
	}

	// 퇴장 처리
	clientsMux.Lock()
	delete(clients, conn)
	clientsMux.Unlock()

	leaveMsg := fmt.Sprintf("[%s] *** %s 님이 퇴장했습니다 ***", getTimeStamp(), nickname)
	fmt.Printf("\033[2K\r%s\n", leaveMsg)
	printInputLine()
	broadcast <- leaveMsg
}

// ==================== 클라이언트 모드 ====================

func runClient(reader *bufio.Reader) {
	clearScreen()

	// 닉네임 입력
	fmt.Print("닉네임을 입력하세요: ")
	nickname, _ := reader.ReadString('\n')
	myNickname = strings.TrimSpace(nickname)
	if myNickname == "" {
		myNickname = fmt.Sprintf("익명%d", time.Now().UnixNano()%1000)
	}

	// 서버 주소 입력
	fmt.Print("접속할 주소 (예: 192.168.0.10:9000): ")
	serverAddr, _ := reader.ReadString('\n')
	serverAddr = strings.TrimSpace(serverAddr)

	// 포트 기본값 추가
	if !strings.Contains(serverAddr, ":") {
		serverAddr += ":9000"
	}

	fmt.Printf("\n연결 중... (%s)\n", serverAddr)

	conn, err := net.Dial("tcp", serverAddr)
	if err != nil {
		fmt.Printf("연결 실패: %v\n", err)
		fmt.Print("\n아무 키나 누르면 메뉴로 돌아갑니다...")
		reader.ReadByte()
		return
	}
	defer conn.Close()

	printClientHeader := func() {
		clearScreen()
		fmt.Println("         __  __                            _ ")
		fmt.Println("  ___   / _|/ _|_ __ ___  ___ ___  _ __ __| |")
		fmt.Println(" / _ \\ | |_| |_| '__/ _ \\/ __/ _ \\| '__/ _` |")
		fmt.Println("| (_) ||  _|  _| | |  __/ (_| (_) | | | (_| |")
		fmt.Println(" \\___/ |_| |_| |_|  \\___|\\___\\___/|_|  \\__,_|")
		fmt.Println()
		fmt.Println("  /l 접속자  /c 클리어  /m 메뉴  /q 종료")
		fmt.Println()
		printInputLine()
	}

	printClientHeader()

	// 서버 메시지 수신 고루틴
	done := make(chan bool)
	go func() {
		scanner := bufio.NewScanner(conn)
		for scanner.Scan() {
			msg := scanner.Text()

			// 닉네임 요청 처리
			if msg == "NICK_REQUEST" {
				conn.Write([]byte(myNickname + "\n"))
				continue
			}

			fmt.Printf("\033[2K\r%s\n", msg)
			printInputLine()
		}
		fmt.Println("\n*** 서버와 연결이 끊어졌습니다 ***")
		fmt.Print("아무 키나 누르면 메뉴로 돌아갑니다...")
		done <- true
	}()

	// 사용자 입력 전송
	go func() {
		inputScanner := bufio.NewScanner(os.Stdin)
		for inputScanner.Scan() {
			msg := strings.TrimSpace(inputScanner.Text())
			if msg == "" {
				printInputLine()
				continue
			}

			// 클리어 명령어는 로컬에서 처리
			if msg == "/clear" || msg == "/c" {
				printClientHeader()
				continue
			}

			// 메뉴로 돌아가기
			if msg == "/menu" || msg == "/m" {
				conn.Write([]byte("/quit\n"))
				fmt.Println("메인 메뉴로 돌아갑니다...")
				conn.Close()
				done <- true
				return
			}

			// 프로그램 종료
			if msg == "/quit" || msg == "/q" {
				conn.Write([]byte(msg + "\n"))
				fmt.Println("프로그램을 종료합니다...")
				conn.Close()
				os.Exit(0)
			}

			// 입력한 줄 지우기
			fmt.Print("\033[1A\033[2K")

			_, err := conn.Write([]byte(msg + "\n"))
			if err != nil {
				return
			}
		}
	}()

	<-done
	time.Sleep(time.Second)
}
