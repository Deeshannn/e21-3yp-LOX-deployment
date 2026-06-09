import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../core/theme/app_colors.dart';

class LockerChip extends StatelessWidget {
  const LockerChip({super.key, required this.locker});

  final Locker locker;

  @override
  Widget build(BuildContext context) {
    final alert = locker.securityAlertActive;
    final isLocked = locker.lockState == 'LOCKED';
    final isClosed = locker.doorState == 'CLOSED';

    Color cardBg = locker.isBooked ? const Color(0xFFF3E9E8) : const Color(0xFFE4ECE5);
    Color borderCol = locker.isBooked ? const Color(0xFFE6C8C6) : const Color(0xFFC3D8C6);

    if (alert) {
      cardBg = const Color(0xFFFDE8E8);
      borderCol = const Color(0xFFF8B4B4);
    }

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderCol, width: alert ? 1.5 : 1),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (alert)
                const Icon(Icons.warning_amber_rounded, color: Color(0xFFC81E1E), size: 18)
              else
                const SizedBox(width: 18),
              Text(
                locker.code,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textMain,
                ),
              ),
              const SizedBox(width: 18),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            locker.isBooked ? 'RESERVED' : 'AVAILABLE',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 10,
              letterSpacing: 1.2,
              color: locker.isBooked ? const Color(0xFFB85C58) : AppColors.olive,
            ),
          ),
          const SizedBox(height: 8),

          // Detailed Lock and Door State Icons Row
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isLocked ? Icons.lock_outline : Icons.lock_open,
                size: 16,
                color: isLocked ? AppColors.textLabel : const Color(0xFFD97706),
              ),
              const SizedBox(width: 12),
              Icon(
                isClosed ? Icons.sensor_door_outlined : Icons.sensor_door,
                size: 16,
                color: isClosed ? AppColors.textLabel : const Color(0xFFC95454),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
