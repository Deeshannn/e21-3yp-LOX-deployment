import 'package:flutter/material.dart';

import '../../../data/local/local_store.dart';
import '../../../data/models/access_request.dart';
import '../../../data/models/session_data.dart';
import '../../../data/models/station.dart';
import '../tabs/account/screens/account_screen.dart';
import '../tabs/my_lockers/screens/requests_screen.dart';
import '../tabs/explore/screens/explore_screen.dart';

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
  List<Station> _stations = const [];
  List<AccessRequest> _requests = const [];
  Map<String, String> _membershipStatuses = const {};

  @override
  void initState() {
    super.initState();
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
  /// 
  /// This fetches stations and requests sequentially, but optimizes 
  /// locker fetching by resolving them concurrently via [Future.wait].
  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      debugPrint('🔄 HomeScreen: Starting data load...');
      
      debugPrint('🔄 HomeScreen: Fetching stations...');
      final stations = await widget.session.client.fetchStations();
      debugPrint('✅ HomeScreen: Stations loaded: ${stations.length}');

      debugPrint('🔄 HomeScreen: Fetching membership statuses...');
      final membershipStatuses = await _fetchMembershipStatuses(stations);
      debugPrint(
        '✅ HomeScreen: Membership statuses loaded: ${membershipStatuses.length}',
      );

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
        _membershipStatuses = membershipStatuses;
        _loading = false;
      });
      debugPrint('✅ HomeScreen: Data load complete');
    } catch (error) {
      debugPrint('❌ HomeScreen: Data load failed: $error');
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  /// Fetches membership statuses for all known stations and keeps only
  /// relevant statuses for the requests tab.
  Future<Map<String, String>> _fetchMembershipStatuses(
    List<Station> stations,
  ) async {
    if (stations.isEmpty) return const {};

    final results = await Future.wait(
      stations.map((station) async {
        try {
          final status = await widget.session.client.fetchMembershipStatus(
            station.id,
          );
          return MapEntry(station.id, status);
        } catch (_) {
          return const MapEntry('', 'none');
        }
      }),
    );

    final filtered = <String, String>{};
    for (final entry in results) {
      if (entry.key.isEmpty) continue;
      if (entry.value == 'pending' || entry.value == 'member') {
        filtered[entry.key] = entry.value;
      }
    }
    return filtered;
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
      appBar: AppBar(title: const Text('')),
      body: IndexedStack(
        index: _tabIndex,
        // Using an IndexedStack allows us to preserve the state of each tab's screen when switching between them.
        children: [
          StationsView(
            stations: _stations,
            locationDraft: _locationDraft,
            savedLocation: _savedLocation,
            savingLocation: _savingLocation,
            onLocationChanged: (val) => setState(() => _locationDraft = val),
            onSaveLocation: _saveLocation,
            client: widget.session.client,
            onRefresh: _loadData,
          ),
          RequestsScreen(
            requests: _requests,
            stations: _stations,
            membershipStatuses: _membershipStatuses,
            onRefresh: _loadData,
            client: widget.session.client,
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