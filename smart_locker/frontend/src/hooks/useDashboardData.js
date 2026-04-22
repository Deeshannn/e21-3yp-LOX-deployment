import React from 'react';
import { apiRequest, authHeaders } from '../services/apiClient';

export function useDashboardData(token, user) {
  const [stations, setStations] = React.useState([]);
  const [selectedStationId, setSelectedStationId] = React.useState('');
  const [lockers, setLockers] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [queueEntries, setQueueEntries] = React.useState([]);
  const [events, setEvents] = React.useState([]);

  const headers = React.useMemo(() => authHeaders(token), [token]);

  const load = React.useCallback(async () => {
    if (!token || !user) {
      return;
    }

    const [stationsData, requestsData, eventsData] = await Promise.all([
      apiRequest('/stations', { headers }),
      apiRequest('/requests', { headers }),
      apiRequest('/events?limit=50', { headers })
    ]);

    setStations(stationsData.stations || []);
    setRequests(requestsData.requests || []);
    setEvents(eventsData.events || []);

    const stationList = stationsData.stations || [];
    const hasSelected = stationList.some((station) => station._id === selectedStationId);
    const stationIdToLoad = hasSelected ? selectedStationId : stationList[0]?._id || '';

    if (stationIdToLoad !== selectedStationId) {
      setSelectedStationId(stationIdToLoad);
    }

    if (!stationIdToLoad) {
      setLockers([]);
      setQueueEntries([]);
      return;
    }

    const [lockerData, queueData] = await Promise.all([
      apiRequest(`/lockers?stationId=${stationIdToLoad}`, { headers }),
      apiRequest(`/queue?stationId=${stationIdToLoad}`, { headers })
    ]);

    setLockers(lockerData.lockers || []);
    setQueueEntries(queueData.queueEntries || []);
  }, [headers, selectedStationId, token, user]);

  return {
    stations,
    selectedStationId,
    setSelectedStationId,
    lockers,
    requests,
    queueEntries,
    events,
    load
  };
}
