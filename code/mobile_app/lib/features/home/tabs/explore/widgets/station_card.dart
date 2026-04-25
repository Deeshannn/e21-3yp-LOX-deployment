import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../../data/models/station.dart';

/// A reusable UI component that displays a summary card for a single locker station.
///
/// This card presents the station's name, code, a progress bar indicating 
/// locker availability, and an optional distance label. It is designed to be 
/// tapped by the user to navigate to the station's detailed view.
class StationCard extends StatelessWidget {
  const StationCard({
    super.key,
    required this.station,
    required this.total,
    required this.free,
    required this.onTap,
    this.distanceLabel,
  });

  /// The station data model containing the name, code, and coordinates.
  final Station station;

  /// The absolute total number of lockers at this station (booked + unbooked).
  final int total;

  /// The number of unbooked, available lockers currently at this station.
  final int free;

  /// A pre-formatted string showing the distance to the station (e.g., "850 m").
  /// If null, the distance badge is hidden entirely.
  final String? distanceLabel;

  /// Callback triggered when the entire card is tapped.
  final VoidCallback onTap;

  static const _card  = Colors.white;
  static const _muted = Color(0xFFA6A39B);
  static const _text  = Color(0xFF1F1E1B);
  static const _olive = Color(0xFF5B5A3D);
  static const _track = Color(0xFFE7E4DD);

  @override
  Widget build(BuildContext context) {
    // Calculate the availability ratio for the progress bar.
    // Handles the edge case where a station has 0 total lockers to avoid division by zero.
    // Clamps the result between 0.0 and 1.0 just in case data gets out of sync.
    final ratio = total == 0 ? 0.0 : (free / total).clamp(0.0, 1.0);

    return InkWell(
      borderRadius: BorderRadius.circular(26),
      onTap: onTap,
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
          // Leading Icon
          children: [
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F0EC),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.lock_outline_rounded, color: _olive),
            ),
            const SizedBox(width: 14),

            // Main Content Column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // Station name
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

                  // Station code
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
                      // math.max prevents negative totals from rendering if bad data arrives
                      Text(
                        '$free / ${math.max(total, 0)} available',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: _olive,
                        ),
                      ),
                      const Spacer(),

                      // Distance Badge (Only renders if a distance was calculated)
                      if (distanceLabel != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F0EC),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            distanceLabel!,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: _text,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Visual Availability Indicator
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
    );
  }
}