@echo off
title SHI - Servidor de Desenvolvimento
echo.
echo ========================================
echo   SHI - Sistema Hidroponico Integrado
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js/npm nao encontrado.
  echo Instale em https://nodejs.org e tente novamente.
  pause
  exit /b 1
)

echo Mapeando pasta do projeto...
pushd "%~dp0"
if errorlevel 1 (
  echo ERRO: Nao foi possivel acessar a pasta do projeto.
  pause
  exit /b 1
)

echo.
echo Servidor iniciando...
echo.
echo   No PC:       http://localhost:3000/login
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress); if ($ip) { $ip } else { 'SEU-IP-WIFI' }"`) do set WIFI_IP=%%i
echo   No celular:  http://%WIFI_IP%:3000/login
echo.
echo   IMPORTANTE: celular e PC precisam estar na MESMA rede Wi-Fi.
echo   Nao use localhost no celular — ele so funciona no computador.
echo.
echo   E-mail:  promotor@teste.com  ou  promotorac@teste.com
echo   Senha:   teste123
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.

set WATCHPACK_POLLING=true
set COOKIE_SECURE=false
call npm run dev

if errorlevel 1 (
  echo.
  echo ERRO ao iniciar o servidor. Verifique se a porta 3000 esta livre.
  pause
)

popd
