import 'package:flutter/material.dart';

/// Local enum for sort options. Kept here to avoid coupling to the parent screen
/// so the widget can be reused independently.
enum HomeStationSort { distance, availability }


/// A custom segmented control widget that allows the user to toggle between different sorting strategies for the stations list.
///
/// Visually appears as a pill-shaped container with two mutually exclusive options.
/// (e.g., "Distance" and "High availability").
class SortPill extends StatelessWidget {
  const SortPill({
    super.key,
    required this.value,
    required this.onChanged,
  });

  /// The currently active sorting method.
  final HomeStationSort value;

  /// Callback triggered when the user taps a different sorting segment.
  /// Passes the newly selected [HomeStationSort] back to the parent.
  final ValueChanged<HomeStationSort> onChanged;


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
          // Expanded ensures both segments take up exactly 50% of the width
          Expanded(
            child: _Segment(
              active: value == HomeStationSort.distance,
              text: 'Distance',
              onTap: () => onChanged(HomeStationSort.distance),
            ),
          ),
          Expanded(
            child: _Segment(
              active: value == HomeStationSort.availability,
              text: 'High availability',
              onTap: () => onChanged(HomeStationSort.availability),
            ),
          ),
        ],
      ),
    );
  }
}

/// A private helper widget representing an individual selectable segment within the [SortPill].
///
/// Handles its own active/inactive styling, including text color and an elevated shadow effect when active.
class _Segment extends StatelessWidget {
  const _Segment({
    required this.active,
    required this.text,
    required this.onTap,
  });

  /// Determines if this segment is currently selected.
  /// If true, applies a white background, shadow, and dark text.
  final bool active;

  /// The display label for this segment. (e.g., "Distance" or "High availability")
  final String text;

  /// Callback triggered when this specific segment is tapped.
  final VoidCallback onTap;

  static const _muted = Color(0xFFA6A39B);
  static const _text  = Color(0xFF1F1E1B);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          // Active state gets a solid white background; inactive is transparent to let the parent track color show through.
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          // Apply a soft drop shadow only when active to make it "pop".
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