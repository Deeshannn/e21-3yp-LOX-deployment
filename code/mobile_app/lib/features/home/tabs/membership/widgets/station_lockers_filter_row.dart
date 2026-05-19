import 'package:flutter/material.dart';

class StationLockersFilterRow extends StatelessWidget {
  const StationLockersFilterRow({
    super.key,
    required this.filterType,
    required this.onAllTap,
    required this.onToggleFilter,
    required this.textColor,
    required this.mutedColor,
  });

  final String filterType;
  final VoidCallback onAllTap;
  final ValueChanged<String> onToggleFilter;
  final Color textColor;
  final Color mutedColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: onAllTap,
            behavior: HitTestBehavior.opaque,
            child: Container(
              padding: const EdgeInsets.only(bottom: 4),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: filterType == 'all' ? textColor : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                'INTERACTIVE FLOOR MAP',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: filterType == 'all' ? textColor : mutedColor,
                ),
              ),
            ),
          ),
          Row(
            children: [
              _FilterDot(
                label: 'FREE',
                dotColor: const Color(0xFFD3E5D3),
                filterType: filterType,
                onTap: onToggleFilter,
                mutedColor: mutedColor,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FilterDot extends StatelessWidget {
  const _FilterDot({
    required this.label,
    required this.dotColor,
    required this.filterType,
    required this.onTap,
    required this.mutedColor,
  });

  final String label;
  final Color dotColor;
  final String filterType;
  final ValueChanged<String> onTap;
  final Color mutedColor;

  @override
  Widget build(BuildContext context) {
    final type = label.toLowerCase();
    final isActive = filterType == type || filterType == 'all';

    return GestureDetector(
      onTap: () => onTap(type),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isActive ? dotColor : Colors.grey.shade300,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: isActive ? mutedColor : Colors.grey.shade400,
            ),
          ),
        ],
      ),
    );
  }
}
