# Deploys every real Edge Function under supabase/functions/, explicitly
# excluding `_shared` (a helper directory, not a function). If your previous
# deployment loop tried to deploy `_shared` and aborted on the first
# failure -- and `_shared` sorts alphabetically before every real function
# name (underscore < lowercase letters) -- NONE of your functions would have
# actually deployed, which matches "I pushed the edge code but it wasn't
# working" exactly.
#
# Usage: .\scripts\deploy-functions.ps1 -ProjectRef <project-ref>
# Requires: supabase CLI logged in (supabase login).

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRef
)

$FunctionsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "supabase\functions"

$Succeeded = @()
$Failed = @()

Get-ChildItem -Path $FunctionsDir -Directory | ForEach-Object {
    $name = $_.Name

    if ($name -eq "_shared") {
        Write-Host "skip:    $name (shared helper code, not a function)"
        return
    }

    $indexPath = Join-Path $_.FullName "index.ts"
    if (-not (Test-Path $indexPath)) {
        Write-Host "skip:    $name (no index.ts found)"
        return
    }

    Write-Host "deploy:  $name"
    # Each iteration runs independently -- one function failing does not
    # stop the loop from attempting the rest, unlike a script that exits on
    # the first non-zero exit code.
    supabase functions deploy $name --project-ref $ProjectRef
    if ($LASTEXITCODE -eq 0) {
        $Succeeded += $name
    } else {
        Write-Host "FAILED:  $name" -ForegroundColor Red
        $Failed += $name
    }
}

Write-Host ""
Write-Host "=== Summary ==="
Write-Host ("Succeeded ({0}): {1}" -f $Succeeded.Count, ($Succeeded -join ", "))
Write-Host ("Failed    ({0}): {1}" -f $Failed.Count, ($Failed -join ", "))

if ($Failed.Count -gt 0) {
    exit 1
}
