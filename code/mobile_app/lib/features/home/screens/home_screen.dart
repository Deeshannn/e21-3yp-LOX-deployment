import 'dart:async';
import 'package:flutter/material.dart';

import '../../../data/local/local_store.dart';
import '../../../data/models/access_request.dart';
import '../../../data/models/session_data.dart';
import '../../../data/models/station.dart';
import '../../account/screens/account_screen.dart';
import '../tabs/membership/screens/requests_screen.dart';
import '../tabs/my_lockers/screens/my_lockers_screen.dart';
import '../tabs/explore/screens/explore_screen.dart';

/// The primary shell screen for authenticated users.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session, required this.onLogout});

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
  double? _savedLatitude;
  double? _savedLongitude;

  // Core Data State
  List<Station> _stations = const [];
  List<AccessRequest> _requests = const [];
  Map<String, String> _membershipStatuses = const {};

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
    _savedLatitude = uiPrefs.savedLatitude;
    _savedLongitude = uiPrefs.savedLongitude;

    await _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      // ONLY show full screen loader if we have no stations yet (initial load)
      _loading = _stations.isEmpty; 
      _error = null;
    });
    try {
      // debugPrint('HomeScreen: Starting data load...');
      final stations = await widget.session.client.fetchStations();

      // debugPrint('HomeScreen: Fetching membership statuses...');
      final membershipStatuses = await _fetchMembershipStatuses(stations);

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
    } catch (error) {
      debugPrint('❌ HomeScreen: Data load failed: $error');
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }
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
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      extendBody: true, // Allows content to flow under the nav bar
      body: SafeArea(
        bottom: false, // Ensures lists can reach the bottom of the screen
        child: IndexedStack(
          index: _tabIndex,
          children: [
            StationsView(
              stations: _stations,
              locationDraft: _locationDraft,
              savedLocation: _savedLocation,
              initialLatitude: _savedLatitude,
              initialLongitude: _savedLongitude,
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
            MyLockersScreen(
              client: widget.session.client,
              selectedStationId: _selectedStationId,
              stations: _stations,
              onStationResolved: (stationId) {
                if (_selectedStationId == stationId) {
                  return;
                }
                setState(() {
                  _selectedStationId = stationId;
                });
                unawaited(LocalStore.saveSelectedStation(stationId));
              },
            ),
            AccountScreen(user: widget.session.user, onLogout: widget.onLogout),
          ],
        ),
      ),
      bottomNavigationBar: _buildFloatingNavBar(),
    );
  }

  // --- UI HELPER METHODS ---

  Widget _buildFloatingNavBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.only(left: 24, right: 24, bottom: 24),
        child: Container(
          height: 70,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.95),
            borderRadius: BorderRadius.circular(40),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildNavItem(icon: Icons.map, label: 'EXPLORE', index: 0),
              _buildNavItem(
                icon: Icons.lock_outline,
                label: 'STATIONS',
                index: 1,
              ),
              _buildNavItem(
                icon: Icons.assignment_outlined,
                label: 'LOCKERS',
                index: 2,
              ),
              _buildNavItem(
                icon: Icons.person_outline,
                label: 'ACCOUNT',
                index: 3,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final isSelected = _tabIndex == index;
    final color = isSelected ? Colors.black : Colors.grey.shade400;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _tabIndex = index),
      child: SizedBox(
        width: 70,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
