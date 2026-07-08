# SHI - Inicia o servidor de desenvolvimento (corrige problema de caminho UNC)
$projeto = "\\26.150.22.166\btsrv\CARLOS\001 App,s  em desenvolvimento\Sistema-Consignado"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SHI - Sistema Hidroponico Integrado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Acesse: http://localhost:3000/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar, pressione Ctrl+C" -ForegroundColor Gray
Write-Host ""

cmd /c "cd /d C:\Users\laiss && pushd `"$projeto`" && set WATCHPACK_POLLING=true && npm run dev"
