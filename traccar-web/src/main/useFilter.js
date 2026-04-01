import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

export default (
  keyword,
  filter,
  filterSort,
  filterMap,
  positions,
  setFilteredDevices,
  setFilteredPositions,
) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const deviceList = Object.values(devices);
    const lowerCaseKeyword = keyword?.trim().toLowerCase();

    const filtered = deviceList.filter((device) => {
      // 1. Status Filter
      if (filter.statuses.length && !filter.statuses.includes(device.status)) return false;
      
      // 2. Group Filter
      if (filter.groups.length && !deviceGroups(device).some((id) => filter.groups.includes(id))) return false;
      
      // 3. Keyword Search (S99 Optimization: Early exit)
      if (lowerCaseKeyword) {
          const matchFound = [device.name, device.uniqueId, device.phone, device.model, device.contact].some(
            (s) => s && s.toLowerCase().includes(lowerCaseKeyword),
          );
          if (!matchFound) return false;
      }
      
      return true;
    });

    // 4. Optimized Sorting
    if (filterSort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterSort === 'lastUpdate') {
      filtered.sort((a, b) => {
        const t1 = a.lastUpdate ? dayjs(a.lastUpdate).valueOf() : 0;
        const t2 = b.lastUpdate ? dayjs(b.lastUpdate).valueOf() : 0;
        return t2 - t1;
      });
    }

    setFilteredDevices(filtered);
    setFilteredPositions(
      filterMap
        ? filtered.map((device) => positions[device.id]).filter(Boolean)
        : Object.values(positions),
    );
  }, [
    keyword,
    filter,
    filterSort,
    filterMap,
    groups,
    devices,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  ]);
};
