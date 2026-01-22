@echo off
echo ==========================================
echo    BAIXANDO ALTERACOES DO MAIN
echo ==========================================
echo.
echo 1. Indo buscar novidades no MAIN...
git checkout main
git pull origin main
echo.
echo 2. Trazendo novidades para o seu DEV...
git checkout dev
git merge main
echo.
echo ==========================================
echo          SUCESSO! TUDO ATUALIZADO.
echo ==========================================
pause
