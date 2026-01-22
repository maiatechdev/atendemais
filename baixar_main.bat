@echo off
echo ==========================================
echo    BAIXANDO ALTERACOES DO MAIN
echo ==========================================
echo.
<<<<<<< HEAD
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
=======
echo Buscando novidades na nuvem...
git pull origin main
echo.
echo ==========================================
echo          SUCESSO! TUDO ATUALIZADO DO MAIN.
>>>>>>> 674989dd9ec2c4c3a3a4ac8c23843606436e1cbc
echo ==========================================
pause
