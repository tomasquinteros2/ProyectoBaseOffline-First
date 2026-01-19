@echo off
title Ecopila Stock System - Launcher
:: Configura el tamaño de la ventana (columnas, lineas)
mode con: cols=70 lines=25
:: Configura el color (0 = Fondo Negro, A = Texto Verde Claro)
color 0A
cls
:MENU
echo ======================================================
echo        ECOPILA STOCK SYSTEM - MENU DE INICIO
echo ======================================================
echo.
echo  [1] INICIAR (Rapido)
echo      - Solo levanta los contenedores existentes.
echo      - Usar para el dia a dia.
echo.
echo  [2] INSTALAR Y INICIAR (Lento)
echo      - Reconstruye las imagenes y luego inicia.
echo      - Usar cuando hay cambios en el codigo o primera vez.
echo.
echo  [3] SALIR
echo.
echo ======================================================
set /p opcion="Seleccione una opcion (1-3): "

if "%opcion%"=="1" goto START_FAST
if "%opcion%"=="2" goto START_BUILD
if "%opcion%"=="3" exit
goto MENU

:START_FAST
echo Iniciando sistema rapido...
:: Opcion A: Si tu script soporta argumentos, pasale uno
:: start "" "C:\Users\tomas\Desktop\Version 2\Ecopila\start-offline.sh" --no-build
:: Opcion B: Si tienes un script separado para solo levantar (recomendado)
:: start "" "C:\Users\tomas\Desktop\Version 2\Ecopila\start-only.sh"
:: Opcion C (Temporal): Usamos el mismo script pero asumiendo que lo modificaras para no hacer build siempre
start "" "C:\Users\tomas\Desktop\Version 2\Ecopila\start-offline.sh"
timeout /t 5
exit

:START_BUILD
echo Ejecutando instalacion y construccion...
:: Aqui podrias llamar a un script especifico de instalacion o pasar un flag
start "" "C:\Users\tomas\Desktop\Version 2\Ecopila\start-offline.sh" --build
timeout /t 5
exit