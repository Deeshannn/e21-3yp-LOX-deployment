import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

import '../../../data/local/local_store.dart';
import '../../../data/models/access_request.dart';
import '../../../data/models/locker.dart';
import '../../../data/models/session_data.dart';
import '../../../data/models/station.dart';
import '../tabs/account/screens/account_screen.dart';
import '../tabs/my_lockers/screens/requests_screen.dart';
import '../tabs/explore/widgets/station_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session, required this.onLogout});

  final SessionData session;
  final Future<void> Function() onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tabIndex = 0;
  bool _loading = true;
  String? _error;

  String _locationDraft = '';
  String _savedLocation = '';
  String _selectedStationId = '';
  bool _savingLocation = false;

  List<Station> _stations = const [];
  List<AccessRequest> _requests = const [];
  final Map<String, List<Locker>> _lockersByStation = {};

  @override
  void initState() {
    super.initState();
    _loadUiPrefsAndData();
  }

  Future<void> _loadUiPrefsAndData() async {
    final uiPrefs = await LocalStore.loadUiPrefs();
    _locationDraft = uiPrefs.savedLocation;
    _savedLocation = uiPrefs.savedLocation;
    _selectedStationId = uiPrefs.selectedStationId;
    await _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final stations = await widget.session.client.fetchStations();
      final requests = await widget.session.client.fetchRequests();

      _lockersByStation.clear();
      final lockerEntries = await Future.wait(
        stations.map((station) async {
          try {
            final lockers = await widget.session.client.fetchLockers(station.id);
            return MapEntry(station.id, lockers);
          } catch (_) {
            return MapEntry(station.id, <Locker>[]);
          }
        }),
      );
      _lockersByStation.addEntries(lockerEntries);

      if (_selectedStationId.isNotEmpty &&
          !stations.any((s) => s.id == _selectedStationId)) {
        _selectedStationId = '';
      }
      if (_selectedStationId.isEmpty && stations.isNotEmpty) {
        _selectedStationId = stations.first.id;
      }
      await LocalStore.saveSelectedStation(_selectedStationId);

      if (!mounted) return;
      setState(() {
        _stations = stations;
        _requests = requests;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _saveLocation() async {
    setState(() => _savingLocation = true);
    final next = _locationDraft.trim();
    await LocalStore.saveLocation(next);
    if (!mounted) return;
    setState(() {
      _savedLocation = next;
      _savingLocation = false;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Location saved.')));
  }

  List<Station> get _filteredStations {
  // Return the raw list. Distance sorting is handled
  // separately in _HomeStationsView!
  return _stations;
}

  AccessRequest? _activeRequestForStation(String stationId) {
    for (final r in _requests) {
      if (r.stationId == stationId &&
          (r.status == 'PENDING' || r.status == 'QUEUED')) {
        return r;
      }
    }
    return null;
  }

  int _freeCountForStation(String stationId) {
    return (_lockersByStation[stationId] ?? const [])
        .where((l) => !l.isBooked)
        .length;
  }

  Future<void> _openStation(Station station) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => StationDetailScreen(
          client: widget.session.client,
          station: station,
          initialLockers: _lockersByStation[station.id] ?? const [],
          activeRequest: _activeRequestForStation(station.id),
        ),
      ),
    );
    if (result == true) await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Smart Locker')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(onPressed: _loadData, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Smart Locker')),
      body: IndexedStack(
        index: _tabIndex,
        children: [
          _HomeStationsView(
            stations: _filteredStations,
            lockersByStation: _lockersByStation,
            locationDraft: _locationDraft,
            savedLocation: _savedLocation,
            savingLocation: _savingLocation,
            onLocationChanged: (val) => setState(() => _locationDraft = val),
            onSaveLocation: _saveLocation,
            activeRequestForStation: _activeRequestForStation,
            freeCountForStation: _freeCountForStation,
            onOpenStation: _openStation,
            onRefresh: _loadData,
          ),
          RequestsScreen(
            requests: _requests,
            stations: _stations,
            onRefresh: _loadData,
          ),
          AccountScreen(user: widget.session.user, onLogout: widget.onLogout),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

enum HomeStationSort { distance, availability }

class _HomeStationsView extends StatefulWidget {
  const _HomeStationsView({
    required this.stations,
    required this.lockersByStation,
    required this.locationDraft,
    required this.savedLocation,
    required this.savingLocation,
    required this.onLocationChanged,
    required this.onSaveLocation,
    required this.activeRequestForStation,
    required this.freeCountForStation,
    required this.onOpenStation,
    required this.onRefresh,
  });

  final List<Station> stations;
  final Map<String, List<Locker>> lockersByStation;
  final String locationDraft;
  final String savedLocation;
  final bool savingLocation;
  final ValueChanged<String> onLocationChanged;
  final Future<void> Function() onSaveLocation;
  final AccessRequest? Function(String stationId) activeRequestForStation;
  final int Function(String stationId) freeCountForStation;
  final Future<void> Function(Station station) onOpenStation;
  final Future<void> Function() onRefresh;

  @override
  State<_HomeStationsView> createState() => _HomeStationsViewState();
}

class _HomeStationsViewState extends State<_HomeStationsView> {
  static const _bg = Color(0xFFF6F5F1);
  static const _card = Colors.white;
  static const _muted = Color(0xFFA6A39B);
  static const _text = Color(0xFF1F1E1B);
  static const _olive = Color(0xFF5B5A3D);
  static const _pillBg = Color(0xFFE7E4DD);
  static const _track = Color(0xFFE7E4DD);

  HomeStationSort _sort = HomeStationSort.distance;
  Position? _currentPosition;
  bool _locLoading = false;

  Future<void> _pickCurrentLocation() async {
    setState(() => _locLoading = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        _show('Location services are disabled.');
        return;
      }

      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        _show('Location permission denied.');
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      String label = 'Current location';
      try {
        final placemarks = await placemarkFromCoordinates(
          pos.latitude,
          pos.longitude,
        );
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          final city = (place.locality ?? place.subAdministrativeArea ?? '').trim();
          final country = (place.country ?? '').trim();
          final parts = [city, country].where((value) => value.isNotEmpty).toList();
          if (parts.isNotEmpty) label = parts.join(', ');
        }
      } catch (_) {}

      if (!mounted) return;
      setState(() => _currentPosition = pos);

      widget.onLocationChanged(label);
      await widget.onSaveLocation();
    } catch (error) {
      _show(error.toString());
    } finally {
      if (mounted) setState(() => _locLoading = false);
    }
  }

  void _showLocationSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 5,
                decoration: BoxDecoration(
                  color: const Color(0xFFE1DED7),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 14),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Select location',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 10),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: _pillBg,
                  child: Icon(Icons.my_location_rounded, color: _olive),
                ),
                title: const Text(
                  'Use current location',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: const Text('We will sort nearby stations by distance'),
                onTap: () async {
                  Navigator.pop(context);
                  await _pickCurrentLocation();
                },
              ),
              const SizedBox(height: 6),
            ],
          ),
        );
      },
    );
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  double? _distanceMeters(Station station) {
    final pos = _currentPosition;
    if (pos == null) return null;
    if (station.latitude == null || station.longitude == null) return null;

    return Geolocator.distanceBetween(
      pos.latitude,
      pos.longitude,
      station.latitude!,
      station.longitude!,
    );
  }

  String _distanceLabel(double meters) {
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000.0).toStringAsFixed(1)} km';
  }

  @override
  Widget build(BuildContext context) {
    final activeLocationText = widget.locationDraft.trim().isEmpty
        ? (widget.savedLocation.trim().isEmpty
            ? 'Tap to set location'
            : widget.savedLocation.trim())
        : widget.locationDraft.trim();

    final sorted = [...widget.stations];
    sorted.sort((a, b) {
      if (_sort == HomeStationSort.availability) {
        final aFree = widget.freeCountForStation(a.id);
        final bFree = widget.freeCountForStation(b.id);
        return bFree.compareTo(aFree);
      }

      final da = _distanceMeters(a);
      final db = _distanceMeters(b);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    });

    return Container(
      color: _bg,
      child: RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 110),
          children: [
            const Text(
              'ACTIVE LOCATION',
              style: TextStyle(
                color: _muted,
                fontSize: 12,
                letterSpacing: 2.2,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: _locLoading ? null : _showLocationSheet,
              child: Container(
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: _pillBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: Color(0xFFDCD8D0),
                      child: Icon(Icons.place_outlined, color: _olive),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _locLoading ? 'Detecting location…' : activeLocationText,
                        style: const TextStyle(
                          color: _text,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_locLoading)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      const Icon(Icons.keyboard_arrow_down_rounded),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'All Stations',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: _text,
                    ),
                  ),
                ),
                Material(
                  color: _olive,
                  elevation: 10,
                  shadowColor: Colors.black.withValues(alpha: 0.18),
                  shape: const CircleBorder(),
                  child: IconButton(
                    onPressed: () => _show('Map view coming soon.'),
                    icon: const Icon(Icons.map_outlined, color: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _SortPill(
              value: _sort,
              onChanged: (value) => setState(() => _sort = value),
            ),
            const SizedBox(height: 16),
            if (sorted.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(
                  child: Text(
                    'No stations found.',
                    style: TextStyle(color: _muted, fontWeight: FontWeight.w700),
                  ),
                ),
              )
            else
              ...sorted.map((station) {
                final total = widget.lockersByStation[station.id]?.length ?? 0;
                final free = widget.freeCountForStation(station.id);
                final ratio = total == 0 ? 0.0 : (free / total).clamp(0.0, 1.0);
                final dist = _distanceMeters(station);
                final distLabel = dist == null ? null : _distanceLabel(dist);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(26),
                    onTap: () => widget.onOpenStation(station),
                    child: Container(
                      decoration: BoxDecoration(
                        color: _card,
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 18,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F0EC),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: const Icon(
                              Icons.lock_outline_rounded,
                              color: _olive,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  station.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: _text,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  station.code,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: _muted,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Text(
                                      '$free / ${math.max(total, 0)} available',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        color: _olive,
                                      ),
                                    ),
                                    const Spacer(),
                                    if (distLabel != null)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F0EC),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          distLabel,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w900,
                                            color: _text,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: LinearProgressIndicator(
                                    value: ratio,
                                    minHeight: 8,
                                    backgroundColor: _track,
                                    valueColor:
                                        const AlwaysStoppedAnimation(_olive),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.chevron_right_rounded, color: _muted),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _SortPill extends StatelessWidget {
  const _SortPill({required this.value, required this.onChanged});

  final HomeStationSort value;
  final ValueChanged<HomeStationSort> onChanged;

  static const _muted = Color(0xFFA6A39B);
  static const _text = Color(0xFF1F1E1B);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F0EC),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Expanded(
            child: _seg(
              active: value == HomeStationSort.distance,
              text: 'Distance',
              onTap: () => onChanged(HomeStationSort.distance),
            ),
          ),
          Expanded(
            child: _seg(
              active: value == HomeStationSort.availability,
              text: 'High availability',
              onTap: () => onChanged(HomeStationSort.availability),
            ),
          ),
        ],
      ),
    );
  }

  Widget _seg({
    required bool active,
    required String text,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          boxShadow: active
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.07),
                    blurRadius: 14,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: active ? _text : _muted,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}
