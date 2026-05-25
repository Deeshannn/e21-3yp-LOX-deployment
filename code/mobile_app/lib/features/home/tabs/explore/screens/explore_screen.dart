import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../widgets/location_pill.dart';
import '../widgets/membership_request_modal.dart';
import '../widgets/station_card.dart';
import '../../../../../data/local/local_store.dart';

/// A core UI component that displays a scrollable list of locker stations.
///
/// Sorting is performed by distance by default; availability-based filtering
/// has been removed per product change.

class StationsView extends StatefulWidget {
  const StationsView({
    super.key,
    required this.stations,
    required this.locationDraft,
    required this.savedLocation,
    required this.initialLatitude,
    required this.initialLongitude,
    required this.savingLocation,
    required this.onLocationChanged,
    required this.onSaveLocation,
    required this.client,
    required this.onRefresh,
  });

  /// The master list of all available stations.
  final List<Station> stations;

  final String locationDraft;
  final String savedLocation;
  final double? initialLatitude;
  final double? initialLongitude;
  final bool savingLocation;
  final ValueChanged<String> onLocationChanged;
  final Future<void> Function() onSaveLocation;
  final ApiClient client;
  final Future<void> Function() onRefresh;

  @override
  State<StationsView> createState() => _StationsViewState();
}

class _StationsViewState extends State<StationsView> {
  static const _bg = Color(0xFFF6F5F1);
  static const _muted = Color(0xFFA6A39B);
  static const _text = Color(0xFF1F1E1B);

  /// Sorting is fixed to distance by default per design change.

  /// The user's exact GPS coordinates, populated after location detection.
  double? _currentLatitude;
  double? _currentLongitude;

  /// Indicates if the device is currently fetching GPS and geocoding data.
  bool _locLoading = false;

  @override
  void initState() {
    super.initState();
    _currentLatitude = widget.initialLatitude;
    _currentLongitude = widget.initialLongitude;
  }

  /// Requests hardware location permissions and retrieves the user's current coordinates.
  ///
  /// Automatically attempts to reverse-geocode the coordinates into a human-readable
  /// city and country (e.g., "Colombo, Sri Lanka") to display in the UI.
  Future<void> _pickCurrentLocation() async {
    setState(() => _locLoading = true);
    // debugPrint("Starting location detection...");
    try {
      // Verify hardware services are active
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        _show('Location services are disabled.');
        return;
      }

      // Check and request app permissions
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        _show('Location permission denied.');
        return;
      }

      // Fetch high-accuracy GPS coordinates
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      String label = 'Current location';
      // debugPrint('Obtained coordinates: ${pos.latitude}, ${pos.longitude}');
      try {
        final placemarks = await placemarkFromCoordinates(
          pos.latitude,
          pos.longitude,
        );
        debugPrint('Geocoding result: $placemarks');
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          // Select subadministrative area (city) and country for the label, if available
          final city = (place.subAdministrativeArea ?? '')
              .trim();
          final country = (place.country ?? '').trim();
          final parts = [city, country].where((v) => v.isNotEmpty).toList();
          if (parts.isNotEmpty) label = parts.join(', ');
        }
      } catch (_) {}

      if (!mounted) return;

      // Update state and trigger parent callbacks to save the new location
      setState(() {
        _currentLatitude = pos.latitude;
        _currentLongitude = pos.longitude;
      });
      await LocalStore.saveLocationCoordinates(
        latitude: pos.latitude,
        longitude: pos.longitude,
      );
      widget.onLocationChanged(label);
      await widget.onSaveLocation();
    } catch (error) {
      _show(error.toString());
    } finally {
      if (mounted) setState(() => _locLoading = false);
    }
  }

  /// Displays a bottom sheet allowing the user to opt into using their device location.
  void _showLocationSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handlebar for the bottom sheet
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
                backgroundColor: Color(0xFFE7E4DD),
                child: Icon(
                  Icons.my_location_rounded,
                  color: Color(0xFF5B5A3D),
                ),
              ),
              title: const Text(
                'Use current location',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: const Text('We will sort nearby stations by distance'),
              onTap: () async {
                Navigator.pop(
                  context,
                ); // Close sheet before starting async work
                await _pickCurrentLocation();
              },
            ),
            const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  /// Calculates the straight-line distance in meters from the user to the [station].
  /// Returns null if the user's position or the station's coordinates are unavailable.
  double? _distanceMeters(Station station) {
    final latitude = _currentLatitude;
    final longitude = _currentLongitude;
    if (latitude == null || longitude == null) return null;
    if (station.latitude == null || station.longitude == null) return null;
    return Geolocator.distanceBetween(
      latitude,
      longitude,
      station.latitude!,
      station.longitude!,
    );
  }

  String? _distanceLabel(Station station) {
    final meters = _distanceMeters(station);
    if (meters == null) return null;
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(1)} km away';
    }
    return '${meters.round()} m away';
  }

  /// Shows the membership request modal for the selected station.
  void _showMembershipModal(Station station) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => MembershipRequestModal(
        station: station,
        client: widget.client,
        onMembershipRequested: widget.onRefresh,
      ),
    );
  }

  /// Returns a new list of stations sorted by distance (closest first).
  List<Station> get _sortedStations {
    final sorted = [...widget.stations];
    if (_currentLatitude == null || _currentLongitude == null) {
      return sorted;
    }
    sorted.sort((a, b) {
      final da = _distanceMeters(a);
      final db = _distanceMeters(b);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    });
    return sorted;
  }

  @override
  Widget build(BuildContext context) {
    final activeLocationText = widget.locationDraft.trim().isEmpty
        ? (widget.savedLocation.trim().isEmpty
              ? 'Tap to set location'
              : widget.savedLocation.trim())
        : widget.locationDraft.trim();

    final sorted = _sortedStations;

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

            // Location display and interactive trigger
            LocationPill(
              label: _locLoading ? 'Detecting location…' : activeLocationText,
              loading: _locLoading,
              onTap: _locLoading ? null : _showLocationSheet,
            ),
            const SizedBox(height: 22),

            // Title & controls section
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
              ],
            ),
            const SizedBox(height: 14),

            const SizedBox(height: 16),

            // Station list or empty state message
            if (sorted.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(
                  child: Text(
                    'No stations found.',
                    style: TextStyle(
                      color: _muted,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              )
            else
              ...sorted.map((station) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  // station card (name only) with tap to show membership modal
                  child: StationCard(
                    station: station,
                    distanceLabel: _distanceLabel(station),
                    onTap: () => _showMembershipModal(station),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
