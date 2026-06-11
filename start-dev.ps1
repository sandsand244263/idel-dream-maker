Write-Host "[Idel-DreamMaker] Cleaning old processes..." -ForegroundColor Green
taskkill /f /im idel-dream-maker.exe 2>$null
taskkill /f /im cargo.exe 2>$null

$portPid = (netstat -aon | Select-String ":1420" | Select-String "LISTENING") -replace '.*\s+(\d+)$', '$1'
if ($portPid) { taskkill /f /pid $portPid 2>$null }

Start-Sleep 1

$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
Write-Host "[Idel-DreamMaker] Starting (first build may take 2-3 min)..." -ForegroundColor Green
npm run tauri dev
pause
