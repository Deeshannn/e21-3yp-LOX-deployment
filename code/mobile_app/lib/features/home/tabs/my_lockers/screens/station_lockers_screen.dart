import 'package:flutter/material.dart';

import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';

/// Displays all available lockers in a station as an interactive floor map.
///
/// This screen fetches the locker list for a given station and displays them
/// in a responsive grid layout. The UI includes station details and locker status.

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
  late List<Locker> _lockers;
  bool _loading = true;
  String? _error;
  String _filterType = 'all'; // 'all', 'free', 'busy'

  @override
  void initState() {
    super.initState();
    _loadLockers();
  }

  Future<void> _loadLockers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      debugPrint('📡 Loading lockers for station: ${widget.station.id}');
      debugPrint('Station name: ${widget.station.name}');
      debugPrint('Station Location: ${widget.station.locationSummary}');
      final lockers = await widget.client.fetchLockers(widget.station.id);
      debugPrint('✅ Loaded ${lockers.length} lockers');
      if (!mounted) return;
      setState(() {
        _lockers = lockers;
        _loading = false;
      });
    } catch (error) {
      debugPrint('❌ Error loading lockers: $error');
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  List<Locker> _getFilteredLockers(List<Locker> lockers) {
    switch (_filterType) {
      case 'free':
        return lockers.where((l) => !l.isBooked).toList();
      case 'busy':
        return lockers.where((l) => l.isBooked).toList();
      default:
        return lockers;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
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
                onPressed: _loadLockers,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_lockers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
            const Icon(Icons.storage, size: 64),
            const SizedBox(height: 8),
            const Text('No lockers available'),
          ],
        ),
      );
    }

    // Calculate statistics
    final totalLockers = _lockers.length;
    final bookedLockers = _lockers.where((l) => l.isBooked).length;
    final availableLockers = totalLockers - bookedLockers;

    // Sort lockers by code for consistent display
    final sortedLockers = [..._lockers]..sort((a, b) => a.code.compareTo(b.code));
    final filteredLockers = _getFilteredLockers(sortedLockers);

    return RefreshIndicator(
      onRefresh: _loadLockers,
      child: CustomScrollView(
        slivers: [
          // Header with back button
          SliverAppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
            title: const Text(
              'STATION HUB',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
            centerTitle: true,
            pinned: true,
            elevation: 0,
          ),
          // Station Info Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.station.name,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16),
                      const SizedBox(width: 4),
                      
                      Expanded(
                      child: Text(
                        'Location: ${widget.station.locationSummary}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                          letterSpacing: 0.3,
                        ),
                      ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Section Title and Filter Tabs
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(left: 16, top: 24, bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'INTERACTIVE FLOOR MAP',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterTab(
                          label: 'ALL',
                          count: totalLockers,
                          isActive: _filterType == 'all',
                          onTap: () => setState(() => _filterType = 'all'),
                        ),
                        const SizedBox(width: 12),
                        _buildFilterTab(
                          label: 'FREE',
                          count: availableLockers,
                          isActive: _filterType == 'free',
                          onTap: () => setState(() => _filterType = 'free'),
                          color: Colors.green,
                        ),
                        const SizedBox(width: 12),
                        _buildFilterTab(
                          label: 'BUSY',
                          count: bookedLockers,
                          isActive: _filterType == 'busy',
                          onTap: () => setState(() => _filterType = 'busy'),
                          color: Colors.orange,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Locker Grid
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final locker = filteredLockers[index];
                  return _buildLockerCard(locker);
                },
                childCount: filteredLockers.length,
              ),
            ),
          ),
          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: 24),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTab({
    required String label,
    required int count,
    required bool isActive,
    required VoidCallback onTap,
    Color? color,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? (color ?? Colors.grey.shade300) : Colors.transparent,
          border: Border(
            bottom: BorderSide(
              color: isActive ? (color ?? Colors.grey.shade400) : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                letterSpacing: 0.5,
                color: isActive ? Colors.black87 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isActive ? Colors.black87 : Colors.grey.shade400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLockerCard(Locker locker) {
    final isAvailable = !locker.isBooked;
    final backgroundColor = isAvailable ? Colors.green.shade50 : Colors.grey.shade200;
    final textColor = isAvailable ? Colors.green.shade900 : Colors.grey.shade700;
    final borderColor = isAvailable ? Colors.green.shade300 : Colors.grey.shade400;

    return GestureDetector(
      onTap: isAvailable
          ? () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Selected locker: ${locker.code}'),
                  duration: const Duration(seconds: 1),
                ),
              );
            }
          : null,
      child: Container(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isAvailable ? Icons.check_circle_outline : Icons.lock_outline,
              color: textColor,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              locker.code,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

