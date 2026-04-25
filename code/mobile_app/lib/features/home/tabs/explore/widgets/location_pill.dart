import 'package:flutter/material.dart';

/// A customized, interactive pill-shaped button used to display and trigger location selection.
///
/// Shows a location icon, a text label (usually the current address), and 
/// a trailing icon that swaps to a loading spinner when location detection is in progress.
class LocationPill extends StatelessWidget {
  const LocationPill({
    super.key,
    required this.label,
    required this.loading,
    this.onTap,
  });

  /// The text to display inside the pill (e.g., "Colombo, Sri Lanka" or "Detecting...").
  final String label;

  /// If true, replaces the trailing chevron icon with a circular progress indicator.
  final bool loading;

  /// Callback triggered when the pill is tapped. 
  /// Passing null will automatically disable the ink ripple effect.
  final VoidCallback? onTap;

  static const _pillBg = Color(0xFFE7E4DD);
  static const _olive  = Color(0xFF5B5A3D);
  static const _text   = Color(0xFF1F1E1B);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      // Match the border radius to the container to ensure the splash effect doesn't bleed outside the rounded corners.
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
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
            // Location Text Label
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: _text,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (loading)
              const SizedBox(
                width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              const Icon(Icons.keyboard_arrow_down_rounded),
          ],
        ),
      ),
    );
  }
}