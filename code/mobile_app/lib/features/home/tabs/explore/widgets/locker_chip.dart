import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';


/// A visual representation of a single locker, typically displayed within a grid.
///
/// This widget automatically adjusts its color palette and status text 
/// to clearly visually distinguish between available and reserved states.
class LockerChip extends StatelessWidget {
  const LockerChip({super.key, required this.locker});

  final Locker locker;

  static const _text = Color(0xFF1F1E1B);
  static const _olive = Color(0xFF5B5A3D);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: locker.isBooked
            ? const Color(0xFFF3E9E8)
            : const Color(0xFFE4ECE5),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: locker.isBooked
              ? const Color(0xFFE6C8C6)
              : const Color(0xFFC3D8C6),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            locker.code,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: _text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            locker.isBooked ? 'RESERVED' : 'AVAILABLE',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 11,
              letterSpacing: 1.4,
              color: locker.isBooked
                  ? const Color(
                      0xFFB85C58,
                    ) // warm muted red, matches borderColor family
                  : _olive, // same olive used for "available" labels everywhere
            ),
          ),
        ],
      ),
    );
  }
}
