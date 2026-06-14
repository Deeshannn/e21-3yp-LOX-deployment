import React from 'react';
import { apiRequest, authHeaders } from '../services/apiClient';

export function useDashboardData(token, user) {
  const [stations, setStations] = React.useState([]);
  const [selectedStationId, setSelectedStationId] = React.useState('');
  const [lockers, setLockers] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [queueEntries, setQueueEntries] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [overdueLockers, setOverdueLockers] = React.useState([]);

  const headers = React.useMemo(() => authHeaders(token), [token]);

  const load = React.useCallback(async () => {
    if (!token || !user) {
      return;
    }

    const isAdmin = user.role === 'SUB_ADMIN' || user.role === 'SUPER_ADMIN';
    const stationIdToLoad = selectedStationId;

    if (stationIdToLoad) {
      // Parallelize all 6 API requests in a single round-trip
      const [stationsData, requestsData, eventsData, lockerData, queueData, overdueData] = await Promise.all([
        apiRequest('/stations', { headers }),
        apiRequest('/requests', { headers }),
        apiRequest('/events?limit=50', { headers }),
        apiRequest(`/lockers?stationId=${stationIdToLoad}`, { headers }),
        apiRequest(`/queue?stationId=${stationIdToLoad}`, { headers }),
        isAdmin
          ? apiRequest(`/stations/${stationIdToLoad}/overdue-lockers`, { headers })
          : Promise.resolve({ overdueLockers: [] })
      ]);

      setStations(stationsData.stations || []);
      setRequests(requestsData.requests || []);
      setEvents(eventsData.events || []);
      setLockers(lockerData.lockers || []);
      setQueueEntries(queueData.queueEntries || []);
      setOverdueLockers(overdueData.overdueLockers || []);

      // If the selected station was deleted or is no longer returned, fallback
      const stationList = stationsData.stations || [];
      const stillExists = stationList.some((station) => station._id === stationIdToLoad);
      if (!stillExists && stationList.length > 0) {
        setSelectedStationId(stationList[0]._id);
      }
    } else {
      // Fallback for initial load when selectedStationId is empty
      const [stationsData, requestsData, eventsData] = await Promise.all([
        apiRequest('/stations', { headers }),
        apiRequest('/requests', { headers }),
        apiRequest('/events?limit=50', { headers })
      ]);

      setStations(stationsData.stations || []);
      setRequests(requestsData.requests || []);
      setEvents(eventsData.events || []);

      const stationList = stationsData.stations || [];
      const fallbackStationId = stationList[0]?._id || '';

      if (fallbackStationId) {
        setSelectedStationId(fallbackStationId);

        const [lockerData, queueData, overdueData] = await Promise.all([
          apiRequest(`/lockers?stationId=${fallbackStationId}`, { headers }),
          apiRequest(`/queue?stationId=${fallbackStationId}`, { headers }),
          isAdmin
            ? apiRequest(`/stations/${fallbackStationId}/overdue-lockers`, { headers })
            : Promise.resolve({ overdueLockers: [] })
        ]);

        setLockers(lockerData.lockers || []);
        setQueueEntries(queueData.queueEntries || []);
        setOverdueLockers(overdueData.overdueLockers || []);
      } else {
        setLockers([]);
        setQueueEntries([]);
        setOverdueLockers([]);
      }
    }
  }, [headers, selectedStationId, token, user]);

  React.useEffect(() => {
    if (!token || !user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      load().catch(() => { });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [token, user, load]);

  return {
    stations,
    selectedStationId,
    setSelectedStationId,
    lockers,
    requests,
    queueEntries,
    events,
    overdueLockers,
    load
  };
}
