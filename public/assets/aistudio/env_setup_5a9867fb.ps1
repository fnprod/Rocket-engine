Write-Host "Initializing LowLatencyController Environment..." -ForegroundColor Cyan

# 1. تفعيل البيئة الافتراضية لبايثون
if (Test-Path "$PSScriptRoot\.venv\Scripts\Activate.ps1") {
    & "$PSScriptRoot\.venv\Scripts\Activate.ps1"
    Write-Host "[+] Python Virtual Environment Activated." -ForegroundColor Green
}

# 2. اكتشاف مسار مترجم MSYS2 UCRT64 وحقنه تلقائياً في PATH
$toolchainCandidates = @(
    "C:\msys64\ucrt64\bin",
    "C:\msys64\mingw64\bin",
    "$env:LOCALAPPDATA\Programs\msys64\ucrt64\bin",
    "C:\Users\fnprod\scoop\apps\gcc\current\bin"
)

$gppDir = $null
foreach ($dir in $toolchainCandidates) {
    if (Test-Path "$dir\g++.exe") {
        $gppDir = $dir
        break
    }
}

if ($gppDir) {
    $env:Path = "$gppDir;$env:Path"
    Write-Host "[+] GCC Toolchain Loaded: $gppDir" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: g++.exe not found in standard paths. Verify MSYS2 installation." -ForegroundColor Yellow
}

# 3. ربط مجلدات المشروع بالـ PATH للجلسة الحالية
$env:Path = "$PSScriptRoot\bin;$PSScriptRoot\scripts;$env:Path"

# 4. توجيه مسارات استدعاء Lua
$env:LUA_PATH = "$PSScriptRoot\src\lua\?.lua;$PSScriptRoot\src\lua\?\init.lua;;"
$env:LUA_CPATH = "$PSScriptRoot\bin\?.dll;$PSScriptRoot\bin\loadall.dll;;"

Write-Host "[+] Local Environment Ready for LowLatencyController." -ForegroundColor Green
