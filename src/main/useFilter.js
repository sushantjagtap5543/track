import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

export default (
  keyword,
  filter,
  filterSort,
  filterMap,
  positions,
) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  return useMemo(() => {
    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId && groups[groupId]) {
        groupIds.push(groupId);
        groupId = groups[groupId].groupId;
      }
      return groupIds;
    };

    const filtered = Object.values(devices)
      .filter((device) => !filter.statuses.length || filter.statuses.includes(device.status))
      .filter((device) => {
        if (!filter.groups.length) return true;
        const groupIds = deviceGroups(device);
        return groupIds.some((id) => filter.groups.includes(id));
      })
      .filter((device) => {
        if (!keyword) return true;
        const lowerCaseKeyword = keyword.toLowerCase();
        return (device.name && device.name.toLowerCase().includes(lowerCaseKeyword)) ||
               (device.uniqueId && device.uniqueId.toLowerCase().includes(lowerCaseKeyword));
      });

    switch (filterSort) {
      case 'name':
        filtered.sort((device1, device2) => device1.name.localeCompare(device2.name));
        break;
      case 'lastUpdate':
        filtered.sort((device1, device2) => {
          const time1 = device1.lastUpdate ? dayjs(device1.lastUpdate).valueOf() : 0;
          const time2 = device2.lastUpdate ? dayjs(device2.lastUpdate).valueOf() : 0;
          return time2 - time1;
        });
        break;
      default:
        break;
    }

    const filteredPositions = filterMap
      ? filtered.map((device) => positions[device.id]).filter(Boolean)
      : Object.values(positions);

    return { filteredDevices: filtered, filteredPositions };
  }, [keyword, filter, filterSort, filterMap, groups, devices, positions]);
};
