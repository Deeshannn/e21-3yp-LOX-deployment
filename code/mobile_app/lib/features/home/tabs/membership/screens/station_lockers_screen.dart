import 'package:flutter/material.dart';

import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../widgets/station_locker_card.dart';
import '../widgets/station_locker_confirmation_card.dart';
import '../widgets/station_lockers_filter_row.dart';
import '../widgets/station_lockers_header_section.dart';

/// Displays all available lockers in a station as an interactive floor map.
class StationLockersScreen extends StatefulWidget {
  const StationLockersScreen({
    super.key,
    required this.station,
    required this.client,
  });

  final Station station;
  final ApiClient client;

  @override
  State<StationLockersScreen> createState() => _StationLockersScreenState();
}

class _StationLockersScreenState extends State<StationLockersScreen> {
  static const _bg = Color(0xFFF6F5F1);
  static const _olive = Color(0xFF5B5A3D);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);

  late List<Locker> _lockers;
  bool _loading = true;
  String? _error;
  String _filterType = 'all'; // 'all', 'free', 'busy'
  bool _reserving = false;
  Locker? _selectedLocker; // Tracks the currently tapped locker

  @override
  void initState() {
    super.initState();
    _loadLockers();
  }

  Future<void> _loadLockers() async {
    setState(() {
      _loading = true;
      _error = null;
      _selectedLocker = null; // Reset selection on reload
    });
    try {
      final lockers = await widget.client.fetchLockers(widget.station.id);
      if (!mounted) return;
      setState(() {
        _lockers = lockers;
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

  /// Reserves the currently selected locker. 
  /// The confirmation dialog is now handled by the custom bottom card.
  Future<void> _reserveSelectedLocker() async {
    final locker = _selectedLocker;
    if (locker == null) return;

    setState(() => _reserving = true);

    try {
      await widget.client.reserveLocker(
        stationId: widget.station.id,
        lockerId: locker.id,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Locker ${locker.code} reserved! Access granted.'),
          // backgroundColor: const Color.fromARGB(255, 132, 210, 135),
        ),
      );

      // Deselect and refresh list
      setState(() => _selectedLocker = null);
      await _loadLockers();
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to reserve locker: $error'),
          // backgroundColor: Colors.red,
        ),
      );

      setState(() => _reserving = false);
    }
  }

  List<Locker> _getFilteredLockers(List<Locker> lockers) {
    switch (_filterType) {
      case 'free':
        return lockers.where((l) => !l.isBooked).toList();
      default: // all
        return lockers;
    }
  }

  void _toggleFilter(String type) {
    setState(() {
      // If tapping the already active filter, clear it back to 'all'
      _filterType = _filterType == type ? 'all' : type;
      _selectedLocker = null; // Clear selection when filtering
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      // The GestureDetector allows the user to tap anywhere in the background 
      // to dismiss the confirmation card.
      body: GestureDetector(
        onTap: () {
          if (_selectedLocker != null) {
            setState(() => _selectedLocker = null);
          }
        },
        behavior: HitTestBehavior.opaque,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: _olive));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: _olive),
                onPressed: _loadLockers,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final sortedLockers = [..._lockers]..sort((a, b) => a.code.compareTo(b.code));
    final filteredLockers = _getFilteredLockers(sortedLockers);

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: _loadLockers,
          color: _olive,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              const SizedBox(height: 50), // Top safe area

              StationLockersHeaderSection(
                stationName: widget.station.name,
                stationLocation: widget.station.locationSummary,
                onBack: () => Navigator.pop(context),
                textColor: _text,
                mutedColor: _muted,
              ),
              const SizedBox(height: 32),

              StationLockersFilterRow(
                filterType: _filterType,
                onAllTap: () {
                  setState(() {
                    _filterType = 'all';
                    _selectedLocker = null;
                  });
                },
                onToggleFilter: _toggleFilter,
                textColor: _text,
                mutedColor: _muted,
              ),
              const SizedBox(height: 24),

              // White Container containing the Grid
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(32),
                ),
                child: filteredLockers.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(
                          child: Text(
                            'No lockers found',
                            style: TextStyle(color: _muted),
                          ),
                        ),
                      )
                    : GridView.builder(
                        padding: EdgeInsets.zero,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3, // 3 items per row like screenshot
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                          childAspectRatio: 1.0,
                        ),
                        itemCount: filteredLockers.length,
                        itemBuilder: (context, index) {
                          final locker = filteredLockers[index];
                          return StationLockerCard(
                            locker: locker,
                            isSelected: _selectedLocker?.id == locker.id,
                            reserving: _reserving,
                            onSelect: () {
                              setState(() => _selectedLocker = locker);
                            },
                            oliveColor: _olive,
                            textColor: _text,
                          );
                        },
                      ),
              ),
              
              // Bottom padding so scroll clears the overlay card
              const SizedBox(height: 250), 
            ],
          ),
        ),

        // Overlapping Confirmation Card
        if (_selectedLocker != null)
          Align(
            alignment: Alignment.bottomCenter,
            child: StationLockerConfirmationCard(
              selectedLockerCode: _selectedLocker!.code,
              reserving: _reserving,
              onConfirm: _reserveSelectedLocker,
              oliveColor: _olive,
              backgroundColor: _bg,
              textColor: _text,
              mutedColor: _muted,
            ),
          ),
      ],
    );
  }
}