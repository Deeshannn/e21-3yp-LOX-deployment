import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';

class ActiveLockerCard extends StatefulWidget {
  const ActiveLockerCard({
    super.key,
    required this.locker,
    required this.stationName,
    required this.client,
    required this.onRefresh,
  });

  final Locker locker;
  final String stationName;
  final ApiClient client;
  final VoidCallback onRefresh;

  @override
  State<ActiveLockerCard> createState() => _ActiveLockerCardState();
}

class _ActiveLockerCardState extends State<ActiveLockerCard> {
  bool _busy = false;

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _runCommand(Future<void> Function() command, String successMsg) async {
    setState(() => _busy = true);
    try {
      await command();
      _show(successMsg);
      widget.onRefresh();
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lock = widget.locker.lockState;
    final door = widget.locker.doorState;
    final alert = widget.locker.securityAlertActive;

    final isLocked = lock == 'LOCKED';
    final isClosed = door == 'CLOSED';

    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(
          color: alert ? const Color(0xFFF8B4B4) : Colors.black.withOpacity(0.06),
          width: alert ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Code and Station name
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.olive.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    widget.locker.code,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.olive,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MY ASSIGNED LOCKER',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: AppColors.textLabel,
                        ),
                      ),
                      Text(
                        widget.stationName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: AppColors.textMain,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_busy)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.olive),
                  ),
              ],
            ),

            const SizedBox(height: 18),

            // Telemetry Badges
            Row(
              children: [
                Expanded(
                  child: _buildStateBadge(
                    'LOCK STATE',
                    lock,
                    isLocked ? Icons.lock_outline_rounded : Icons.lock_open_rounded,
                    isLocked ? AppColors.olive : const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildStateBadge(
                    'DOOR STATE',
                    door,
                    isClosed ? Icons.sensor_door_outlined : Icons.sensor_door,
                    isClosed ? AppColors.olive : const Color(0xFFC95454),
                  ),
                ),
              ],
            ),

            // Security Alert Box
            if (alert) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDE8E8),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF8B4B4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFC81E1E)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.locker.securityAlertMessage.isNotEmpty
                            ? widget.locker.securityAlertMessage
                            : 'Security warning active!',
                        style: const TextStyle(
                          color: Color(0xFFC81E1E),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const Divider(height: 28),

            // Action Command Buttons
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.olive,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _busy
                        ? null
                        : () => _runCommand(
                              () => widget.client.unlockLocker(widget.locker.id),
                              'Locker unlocked successfully.',
                            ),
                    icon: const Icon(Icons.lock_open, size: 18),
                    label: const Text('Unlock', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.oliveDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _busy
                        ? null
                        : () => _runCommand(
                              () => widget.client.lockLocker(widget.locker.id),
                              'Locker locked successfully.',
                            ),
                    icon: const Icon(Icons.lock, size: 18),
                    label: const Text('Lock', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFC95454),
                  side: const BorderSide(color: Color(0xFFC95454)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _busy
                    ? null
                    : () => _runCommand(
                          () => widget.client.releaseLocker(widget.locker.id),
                          'Locker reservation released.',
                        ),
                icon: const Icon(Icons.close, size: 18),
                label: const Text('Release Booking', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStateBadge(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textLabel,
                    letterSpacing: 0.8,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
