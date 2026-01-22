@echo off
echo ==========================================
echo    ENVIANDO ALTERACOES PARA O GITHUB
echo ==========================================
echo.
echo 1. Adicionando arquivos...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" status
echo.
set /p msg="2. Digite o que voce mudou (ex: arrumei cor): "
"C:\Program Files\Git\cmd\git.exe" commit -m "%msg%"
echo.
echo 3. Enviando para a nuvem...
"C:\Program Files\Git\cmd\git.exe" push origin main
echo.
echo ==========================================
echo          SUCESSO! TUDO SALVO.
echo ==========================================
pause
