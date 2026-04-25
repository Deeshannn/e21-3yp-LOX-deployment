import 'package:flutter/material.dart';

/// A simple, highly reusable UI component designed to display a single metric or statistic prominently.
///
/// Visually appears as a softly colored, rounded box with a descriptive 
/// label on top and a large, bold value beneath it.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    required this.borderColor,
  });

  /// The descriptive title for the statistic (e.g., "Available" or "Reserved").
  final String label;

  /// The primary numeric or text value to prominently display.
  final String value;

  /// The fill color for the card's background.
  final Color color;

  /// The color of the card's outer stroke.
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  fontSize: 26, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}