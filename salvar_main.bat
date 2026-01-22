@echo off
echo ==========================================
echo    ENVIANDO ALTERACOES PARA O MAIN
echo ==========================================
echo.
<<<<<<< HEAD
echo 1. Salvando seu trabalho atual na DEV...
git add .
set /p msg="Digite o que voce mudou: "
git commit -m "%msg%"
echo.
echo 2. Atualizando o MAIN com suas mudancas...
git checkout main
git pull origin main
git merge dev
echo.
echo 3. Enviando MAIN para a nuvem...
git push origin main
echo.
echo 4. Voltando para a DEV...
git checkout dev
echo.
=======
echo 1. Adicionando arquivos...
git add .
echo.
set /p msg="2. Digite o que voce mudou (ex: arrumei cor): "
git commit -m "%msg%"
echo.
echo 3. Enviando para a nuvem...
git push origin main
echo.
>>>>>>> 674989dd9ec2c4c3a3a4ac8c23843606436e1cbc
echo ==========================================
echo          SUCESSO! TUDO SALVO NO MAIN.
echo ==========================================
pause
