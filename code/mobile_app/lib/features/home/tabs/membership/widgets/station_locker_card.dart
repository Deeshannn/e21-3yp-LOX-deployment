import 'package:flutter/material.dart';

import '../../../../../data/models/locker.dart';

class StationLockerCard extends StatelessWidget {
  const StationLockerCard({
    super.key,
    required this.locker,
    required this.isSelected,
    required this.reserving,
    required this.onSelect,
    required this.oliveColor,
    required this.textColor,
  });

  final Locker locker;
  final bool isSelected;
  final bool reserving;
  final VoidCallback onSelect;
  final Color oliveColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    final isFree = !locker.isBooked;

    Color bg;
    Color border;
    Color fg;

    if (isSelected) {
      bg = oliveColor;
      border = oliveColor;
      fg = Colors.white;
    } else if (isFree) {
      bg = const Color(0xFFF4F8F4);
      border = const Color(0xFFDFEADF);
      fg = textColor;
    } else {
      bg = const Color(0xFFFFF6F6);
      border = Colors.transparent;
      fg = const Color(0xFFE0D8D8);
    }

    return GestureDetector(
      onTap: () {
        if (isFree && !reserving) {
          onSelect();
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: border,
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              locker.code,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: fg,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(height: 4),
            ],
          ],
        ),
      ),
    );
  }
}
