@echo off
echo ==========================================
echo    ENVIANDO ALTERACOES PARA O MAIN
echo ==========================================
echo.
echo 1. Adicionando arquivos...
git add .
echo.
set /p msg="2. Digite o que voce mudou (ex: arrumei cor): "
git commit -m "%msg%"
echo.
echo 3. Enviando para a nuvem...
git push origin main
echo.
echo ==========================================
echo          SUCESSO! TUDO SALVO NO MAIN.
echo ==========================================
pause
