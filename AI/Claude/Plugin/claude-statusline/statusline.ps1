# Claude Code Context Window Status Line (Windows PowerShell)

# Read JSON from stdin
$inputData = [Console]::In.ReadToEnd()

try {
    $data = $inputData | ConvertFrom-Json

    # Extract token info
    $inputTokens = if ($data.context_window.total_input_tokens) { $data.context_window.total_input_tokens } else { 0 }
    $outputTokens = if ($data.context_window.total_output_tokens) { $data.context_window.total_output_tokens } else { 0 }
    $contextSize = if ($data.context_window.context_window_size) { $data.context_window.context_window_size } else { 200000 }
    $model = if ($data.model.display_name) { $data.model.display_name } else { "Claude" }

    # Calculate
    $totalTokens = $inputTokens + $outputTokens
    $percentUsed = [math]::Floor(($totalTokens * 100) / $contextSize)
    $remainingPercent = 100 - $percentUsed

    # K unit conversion
    $totalK = [math]::Round($totalTokens / 1000, 1)
    $maxK = [math]::Floor($contextSize / 1000)

    # ANSI colors
    $reset = "$([char]27)[0m"
    $bold = "$([char]27)[1m"
    $green = "$([char]27)[92m"
    $yellow = "$([char]27)[93m"
    $red = "$([char]27)[91m"
    $dim = "$([char]27)[2m"

    # Determine color based on usage
    if ($percentUsed -ge 100) {
        $color = $red
        $statusText = "compressed"
    } elseif ($percentUsed -ge 80) {
        $color = $red
        $statusText = "$remainingPercent% left"
    } elseif ($percentUsed -ge 50) {
        $color = $yellow
        $statusText = "$remainingPercent% left"
    } else {
        $color = $green
        $statusText = "$remainingPercent% left"
    }

    # Generate progress bar (20 chars)
    $barWidth = 20
    if ($percentUsed -gt 100) {
        $filled = $barWidth
    } else {
        $filled = [math]::Floor(($percentUsed * $barWidth) / 100)
    }
    $empty = $barWidth - $filled

    # Bar characters
    $barFilled = [string]::new([char]0x2588, $filled)
    $barEmpty = [string]::new([char]0x2591, $empty)

    # Output
    Write-Host "$bold[$model]$reset Context: $color$barFilled$dim$barEmpty$reset $color$statusText$reset $dim($($totalK)K/$($maxK)K)$reset"
}
catch {
    Write-Host "[Claude] Loading status..."
}
