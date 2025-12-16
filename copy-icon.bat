@echo off
echo Copying maki2.png to public\icon.png...
copy "maki2.png" "public\icon.png"
if %errorlevel% == 0 (
    echo Icon copied successfully!
) else (
    echo Error: Failed to copy icon file.
    echo Please manually copy maki2.png to public\icon.png
)
pause

