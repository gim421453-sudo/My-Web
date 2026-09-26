[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('protect', 'unprotect')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$reader = New-Object System.IO.StreamReader([System.Console]::OpenStandardInput(), [System.Text.Encoding]::UTF8)
$inputBase64 = $reader.ReadToEnd().Trim()
$inputBytes = [System.Convert]::FromBase64String($inputBase64)
$scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser

if ($Mode -eq 'protect') {
  try {
    $outputBytes = [System.Security.Cryptography.ProtectedData]::Protect($inputBytes, $null, $scope)
  } catch {
    [System.Console]::Out.Write('MYWEB_DPAPI_PROTECT_FAILED_V1')
    exit 23
  }
} else {
  try {
    $outputBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($inputBytes, $null, $scope)
  } catch {
    [System.Console]::Out.Write('MYWEB_DPAPI_UNPROTECT_FAILED_V1')
    exit 23
  }
}

[System.Console]::Out.Write([System.Convert]::ToBase64String($outputBytes))
