import { useDispatch, useSelector, connect } from 'react-redux';
import {
  geofencesActions,
  groupsActions,
  driversActions,
  maintenancesActions,
  calendarsActions,
} from './store';
import { useEffectAsync } from './reactHelper';
import fetchOrThrow from './common/util/fetchOrThrow';

const CachingController = () => {
  const authenticated = useSelector((state) => !!state.session.user);
  const dispatch = useDispatch();

  useEffectAsync(async () => {
    if (authenticated) {
      const fetchSilent = async (url, action) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            dispatch(action(await response.json()));
          }
        } catch (e) {
          console.warn(`Sync failed for ${url}:`, e);
        }
      };

      await Promise.all([
        fetchSilent('/api/geofences', geofencesActions.refresh),
        fetchSilent('/api/groups', groupsActions.refresh),
        fetchSilent('/api/drivers', driversActions.refresh),
        fetchSilent('/api/maintenance', maintenancesActions.refresh),
        fetchSilent('/api/calendars', calendarsActions.refresh),
      ]);
    }
  }, [authenticated]);

  return null;
};

export default connect()(CachingController);
