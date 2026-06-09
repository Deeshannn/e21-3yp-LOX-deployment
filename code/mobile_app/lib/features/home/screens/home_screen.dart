import 'package:flutter/material.dart';

import '../../../data/local/local_store.dart';
import '../../../data/models/access_request.dart';
import '../../../data/models/locker.dart';
import '../../../data/models/session_data.dart';
import '../../../data/models/station.dart';
import '../../../data/models/user_profile.dart';
import '../tabs/account/screens/account_screen.dart';
import '../tabs/my_lockers/screens/requests_screen.dart';
import '../tabs/explore/screens/station_detail_screen.dart';
import '../tabs/explore/screens/explore_screen.dart';
import '../../store/screens/store_screen.dart';

/// The primary shell screen for authenticated users.
///
/// Coordinates top-level data fetching (stations, lockers, requests) and
/// manages bottom navigation state using an [IndexedStack] to preserve
/// the UI state of individual tabs.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session, required this.onLogout});

  /// Contains the authenticated user profile and the API client.
  final SessionData session;

  final Future<void> Function() onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Navigation State
  int _tabIndex = 0;

  bool _loading = true;
  String? _error;
  bool _savingLocation = false;

  String _locationDraft = '';
  String _savedLocation = '';
  String _selectedStationId = '';

  // Core Data State
  late UserProfile _user;
  List<Station> _stations = const [];
  List<AccessRequest> _requests = const [];

  /// Maps a Station ID to its corresponding list of Lockers.
  final Map<String, List<Locker>> _lockersByStation = {};

  @override
  void initState() {
    super.initState();
    _user = widget.session.user;
    _loadUiPrefsAndData();
  }

  /// Initializes the screen by loading local user preferences first,
  /// then triggers the remote data fetch.
  Future<void> _loadUiPrefsAndData() async {
    final uiPrefs = await LocalStore.loadUiPrefs();

    _locationDraft = uiPrefs.savedLocation;
    _savedLocation = uiPrefs.savedLocation;
    _selectedStationId = uiPrefs.selectedStationId;

    await _loadData();
  }

  /// Fetches all required backend data to populate the home screen.
  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stations = await widget.session.client.fetchStations();
      final requests = await widget.session.client.fetchRequests();

      _lockersByStation.clear();

      // Concurrently fetch lockers for all retrieved stations to reduce load time.
      final lockerEntries = await Future.wait(
        stations.map((station) async {
          try {
            final lockers = await widget.session.client.fetchLockers(
              station.id,
            );
            return MapEntry(station.id, lockers);
          } catch (_) {
            return MapEntry(station.id, <Locker>[]);
          }
        }),
      );
      _lockersByStation.addEntries(lockerEntries);

      // Validate and update the selected station ID.
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

  /// Persists the user's drafted location to local storage.
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

  /// Checks if there is an active (PENDING or QUEUED) access request 
  /// associated with a specific [stationId].
  AccessRequest? _activeRequestForStation(String stationId) {
    for (final r in _requests) {
      if (r.stationId == stationId &&
          (r.status == 'PENDING' || r.status == 'QUEUED')) {
        return r;
      }
    }
    return null;
  }

  /// Calculates the number of unbooked lockers for a given [stationId].
  int _freeCountForStation(String stationId) {
    return (_lockersByStation[stationId] ?? const [])
        .where((l) => !l.isBooked)
        .length;
  }

  /// Navigates to the [StationDetailScreen] for the selected station.
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

    // Dynamic background image logic matching the Web Frontend style
    final hasBackground = _user.homeBackgroundUrl.isNotEmpty;
    final mainDecoration = hasBackground
        ? BoxDecoration(
            image: DecorationImage(
              image: NetworkImage(_user.homeBackgroundUrl),
              fit: BoxFit.cover,
              colorFilter: ColorFilter.mode(
                Colors.white.withOpacity(0.93),
                BlendMode.lighten,
              ),
            ),
          )
        : const BoxDecoration(
            color: Color(0xFFF2F1EF),
          );

    return Scaffold(
      body: Container(
        decoration: mainDecoration,
        child: IndexedStack(
          index: _tabIndex,
          children: [
            StationsView(
              stations: _stations,
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
              onGoToProfile: () {
                setState(() {
                  _tabIndex = 3; // Switches to Profile/Account tab
                });
              },
            ),
            RequestsScreen(
              requests: _requests,
              stations: _stations,
              client: widget.session.client,
              user: _user,
              lockersByStation: _lockersByStation,
              onRefresh: _loadData,
            ),
            StoreScreen(
              client: widget.session.client,
              user: _user,
            ),
            AccountScreen(
              user: _user,
              client: widget.session.client,
              onProfileUpdated: (updatedUser) {
                setState(() {
                  _user = updatedUser;
                });
              },
              onLogout: widget.onLogout,
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline),
            selectedIcon: Icon(Icons.bookmark),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'Store',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
