# Submodule Sync Script
# This script commits local changes in traccar-web and prepares it for pushing to a fork.

# 1. Commit changes in traccar-web
cd traccar-web
git add .
git commit -m "Apply custom changes: Vehicle Number Plate renaming and fixes"

echo "Changes committed locally in traccar-web."
echo "ACTION REQUIRED: Create a fork of traccar/traccar-web on your GitHub."
echo "Then run: git remote add myfork https://github.com/YOUR_USERNAME/traccar-web.git"
echo "Then run: git push myfork HEAD:master"
echo "Finally, update .gitmodules in the main repository to point to your fork."