# PAIMANA-AI: Local Development Runner for Windows
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching PAIMANA-AI (Smart India Hackathon Prototype)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$BackendDir = Join-Path $CurrentDir "paimana-ai-llm-assistant\paimana-ai\backend"
$FrontendDir = Join-Path $CurrentDir "paimana-ai-llm-assistant\paimana-ai\frontend"

if (-not (Test-Path $BackendDir)) {
    $BackendDir = Join-Path $CurrentDir "backend"
    $FrontendDir = Join-Path $CurrentDir "frontend"
}

$VenvPy = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (Test-Path $VenvPy) {
    Write-Host "🐍 Using Python virtual environment: $VenvPy" -ForegroundColor DarkCyan
    $PythonExe = $VenvPy
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    Write-Host "🐍 Using Windows py launcher (Python 3.12)" -ForegroundColor DarkCyan
    $PythonExe = "py"
} else {
    Write-Host "🐍 Using system python" -ForegroundColor DarkCyan
    $PythonExe = "python"
}

Write-Host "📁 Backend directory:  $BackendDir" -ForegroundColor Gray
Write-Host "📁 Frontend directory: $FrontendDir" -ForegroundColor Gray
Write-Host "🌐 Backend will run on:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "🌐 Frontend will run on: http://localhost:5173" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting processes. Press Ctrl+C in this window to stop both.`n" -ForegroundColor White

node "$CurrentDir\start_dev.js"
