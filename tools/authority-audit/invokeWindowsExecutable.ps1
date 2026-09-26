[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PayloadBase64
)

$ErrorActionPreference = 'Stop'

try {
    $payloadJson = [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($PayloadBase64)
    )
    $payload = $payloadJson | ConvertFrom-Json -ErrorAction Stop
    $executable = [string]$payload.executable
    $argumentList = @($payload.args | ForEach-Object { [string]$_ })
} catch {
    Write-Error 'invalid-process-payload'
    exit 1
}

if ([string]::IsNullOrWhiteSpace($executable)) {
    Write-Error 'invalid-process-payload'
    exit 1
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    & $Executable @ArgumentList
    $exitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}

if ($null -eq $exitCode) {
    $exitCode = 0
}

exit [int]$exitCode
