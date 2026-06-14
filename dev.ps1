$src = "I:\Meu Drive\Idea3DWebSite"
$dst = "C:\Users\DeadMeatBR\AppData\Local\Temp\opencode\idea3d-prod"

# Mata servidor anterior se existir
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Sincroniza src/, public/ e arquivos de config
Write-Host "Syncronizando arquivos..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "$dst\src" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$dst\public" -ErrorAction SilentlyContinue
Copy-Item -Path "$src\src", "$src\public", "$src\package.json", "$src\package-lock.json", "$src\index.html", "$src\vite.config.ts", "$src\.env" -Destination $dst -Recurse -Force

# Sobe o servidor
Write-Host "Servidor em http://localhost:5173" -ForegroundColor Green
Set-Location $dst
npx vite --host
