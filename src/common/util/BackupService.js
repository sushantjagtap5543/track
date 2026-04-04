export const saveBackup = (state) => {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      config: state.session.server.attributes,
      userPreferences: state.session.user.attributes
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geosurepath_backup_${new Date().getTime()}.json`;
    link.click();
    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    return false;
  }
};

export const restoreBackup = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Validating basic structure
        if (data.timestamp && data.config) {
          localStorage.setItem('geosurepath_restore_pending', JSON.stringify(data));
          resolve(data);
        } else {
          reject(new Error('Invalid backup file format'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
};
