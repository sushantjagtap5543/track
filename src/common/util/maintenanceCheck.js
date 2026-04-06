// GeoSurePath AI-Driven Maintenance Utility
export const checkMaintenanceStatus = (device, position) => {
  if (!position) return { overdue: false };

  // 1. Odometer-based Maintenance (Default every 5000km)
  const totalDistance = Number(position.attributes.totalDistance || position.attributes.odometer || 0);
  const lastServiceDistance = Number(device.attributes.lastServiceOdometer || 0);
  const maintenanceInterval = Number(device.attributes.maintenanceInterval || 5000000); // 5000km in meters
  
  const distanceSinceService = totalDistance - lastServiceDistance;
  const overdueDistance = distanceSinceService >= maintenanceInterval;

  // 2. Time-based Maintenance (Default every 6 months)
  const lastServiceDate = device.attributes.lastServiceDate ? new Date(device.attributes.lastServiceDate) : null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const overdueTime = lastServiceDate && lastServiceDate < sixMonthsAgo;

  if (overdueDistance || overdueTime) {
    return {
      overdue: true,
      reason: overdueDistance ? `VEHICLE OVERDUE: ${Math.round(distanceSinceService/1000)}km since last service!` : 'VEHICLE OVERDUE: 6+ months since last maintenance!',
      severity: 'warning'
    };
  }

  // 3. Imminent Warning (90% of interval)
  if (distanceSinceService >= maintenanceInterval * 0.9) {
      return {
          overdue: true,
          reason: `MAINTENANCE DUE SOON: Approaching ${Math.round(maintenanceInterval/1000)}km limit`,
          severity: 'info'
      };
  }

  return { overdue: false };
};
