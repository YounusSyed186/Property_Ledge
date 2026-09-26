[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$inputJson = [Console]::In.ReadToEnd()

$stateFile = Join-Path $PSScriptRoot ".retry-state.json"
$maxRetries = 3
$delaySeconds = 5

function Get-State {
    if (Test-Path $stateFile) {
        try {
            return Get-Content $stateFile -Raw | ConvertFrom-Json
        } catch {
            return $null
        }
    }
    return $null
}

function Save-State($state) {
    try {
        $state | ConvertTo-Json -Compress | Set-Content $stateFile -Encoding UTF8
    } catch {
        # Non-fatal if state cannot be written
    }
}

try {
    if ([string]::IsNullOrWhiteSpace($inputJson)) {
        @{ decision = "allow" } | ConvertTo-Json -Compress
        exit 0
    }

    $data = $inputJson | ConvertFrom-Json
    $conversationId = if ($data.conversationId) { $data.conversationId } else { "default" }
    $terminationReason = if ($data.terminationReason) { $data.terminationReason } else { "" }
    $errorMessage = if ($data.error) { $data.error } else { "" }

    $isError = ($terminationReason -eq "error") -or (-not [string]::IsNullOrEmpty($errorMessage) -and $terminationReason -ne "model_stop")

    if ($isError) {
        $state = Get-State
        $retryCount = 0
        if ($state -and $state.conversationId -eq $conversationId) {
            $retryCount = [int]$state.retryCount
        }

        if ($retryCount -ge $maxRetries) {
            # Reset counter after exhausting maximum retries so subsequent fresh errors can be handled
            Save-State @{
                conversationId = $conversationId
                retryCount = 0
                lastResetReason = "exhausted_max_retries"
                timestamp = (Get-Date).ToString("o")
            }
            @{
                decision = "allow"
                reason = "Maximum consecutive automatic retries ($maxRetries) reached for agent execution errors. Halting to expose error."
            } | ConvertTo-Json -Compress
            exit 0
        }

        # Increment consecutive retry count
        $retryCount++
        Save-State @{
            conversationId = $conversationId
            retryCount = $retryCount
            lastError = $errorMessage
            terminationReason = $terminationReason
            timestamp = (Get-Date).ToString("o")
        }

        # 5 second delay before automatically continuing
        if ($delaySeconds -gt 0) {
            Start-Sleep -Seconds $delaySeconds
        }

        @{
            decision = "continue"
            reason = "The previous agent execution terminated due to an error. Retry the task from the current state and continue working. Do not restart completed work."
        } | ConvertTo-Json -Compress
    }
    else {
        # Successful or normal termination: reset consecutive retry counter
        Save-State @{
            conversationId = $conversationId
            retryCount = 0
            lastResetReason = "normal_termination"
            terminationReason = $terminationReason
            timestamp = (Get-Date).ToString("o")
        }

        @{ decision = "allow" } | ConvertTo-Json -Compress
    }
}
catch {
    # Fail-safe: allow stop if unexpected error in hook script itself
    @{ decision = "allow" } | ConvertTo-Json -Compress
}