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
    this.distanceLabel,
    required this.onTap,
  });

  /// The station data model containing the name, code, and coordinates.
  final Station station;

  /// Optional distance text shown when the user location is known.
  final String? distanceLabel;

  /// Callback triggered when the entire card is tapped.
  final VoidCallback onTap;

  static const _card = Colors.white;
  static const _muted = Color(0xFFA6A39B);
  static const _text = Color(0xFF1F1E1B);
  static const _olive = Color(0xFF5B5A3D);

  @override
  Widget build(BuildContext context) {
    // Minimal card: only show station name (design requested by user)

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
              width: 60,
              height: 60,
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
                  // Station name (only)
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
                  if (distanceLabel != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      distanceLabel!,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _muted,
                      ),
                    ),
                  ],
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
