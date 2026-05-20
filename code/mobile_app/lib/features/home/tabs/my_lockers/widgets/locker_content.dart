import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../../../../../data/models/locker.dart';

class LockerContent extends StatelessWidget {
  const LockerContent({
    super.key,
    required this.locker,
    required this.lockingUnlocking,
    required this.releasing,
    required this.onUnlock,
    required this.onLock,
    required this.onRelease,
    required this.formatDateTime,
    required this.timingLabel,
    required this.timingValue,
    required this.timingSubtext,
    required this.timingColor,
    required this.timingIcon,
  });

  final Locker locker;
  final bool lockingUnlocking;
  final bool releasing;
  final VoidCallback onUnlock;
  final VoidCallback onLock;
  final VoidCallback onRelease;
  final String Function(DateTime?) formatDateTime;
  final String timingLabel;
  final String timingValue;
  final String timingSubtext;
  final Color timingColor;
  final IconData timingIcon;

  static const _olive = Color(0xFF5B5A3D);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _successGreen = Color(0xFF42B77A);
  static const _errorRed = Color(0xFFE54B4B);

  @override
  Widget build(BuildContext context) {
    final isUnlocked = locker.lockState == 'unlocked';
    final isDoorOpen = locker.doorState == 'opened';

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x05000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Color(0xFFF2F1ED),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.access_time_filled,
                  color: _olive,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'RESERVED AT',
                    style: TextStyle(
                      color: _muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatDateTime(locker.reservedAt),
                    style: const TextStyle(
                      color: _text,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x05000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isUnlocked ? _successGreen : _errorRed,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (isUnlocked ? _successGreen : _errorRed)
                              .withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(
                      isUnlocked ? Icons.lock_open_rounded : Icons.lock_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isUnlocked ? 'LOCKER\nUNLOCKED' : 'LOCKER\nLOCKED',
                          style: const TextStyle(
                            color: _text,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  CupertinoSwitch(
                    value: isUnlocked,
                    activeColor: _successGreen,
                    onChanged: (value) {
                      if (value && !isUnlocked && !lockingUnlocking) {
                        onUnlock();
                      } else if (!value && isUnlocked && !lockingUnlocking) {
                        onLock();
                      }
                    },
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(color: Color(0xFFF2F1ED), height: 1),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF2F1ED),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isDoorOpen
                          ? Icons.door_sliding_rounded
                          : Icons.door_front_door_rounded,
                      color: _muted,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isDoorOpen ? 'DOOR OPEN' : 'DOOR CLOSED',
                          style: const TextStyle(
                            color: _text,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F7F3),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE7E3D9)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: timingColor.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        timingIcon,
                        color: timingColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            timingLabel,
                            style: const TextStyle(
                              color: _muted,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            timingValue,
                            style: TextStyle(
                              color: timingColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            timingSubtext,
                            style: const TextStyle(
                              color: _muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              height: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton.icon(
                  onPressed: releasing ? null : onRelease,
                  icon: releasing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(
                          Icons.logout_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                  label: Text(
                    releasing ? 'RELEASING...' : 'END SESSION & RELEASE',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: _errorRed,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    shadowColor: _errorRed.withValues(alpha: 0.5),
                    elevation: 8,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'ESECURE LOCKER SESSION: ENCRYPTED',
                style: TextStyle(
                  color: Color(0xFFD4D1C9),
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ],
    );
  }
}