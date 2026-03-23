# Submodule Sync (Windows PowerShell)
# This script commits local changes in traccar-web and prepares it for pushing to a fork.

Set-Location traccar-web
git add .
git commit -m "Apply custom changes: Vehicle Number Plate renaming and fixes"

Write-Host "Changes committed locally in traccar-web." -ForegroundColor Green
Write-Host "ACTION REQUIRED: Create a fork of traccar/traccar-web on your GitHub." -ForegroundColor Yellow
Write-Host "Then run: git remote add myfork https://github.com/YOUR_USERNAME/traccar-web.git"
Write-Host "Then run: git push myfork HEAD:master"
Write-Host "Finally, update .gitmodules in the main repository to point to your fork."
