import 'package:flutter/material.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';

/// Modal bottom sheet for requesting membership to a station.
/// Displays the station name, membership status, and a button to request membership.
class MembershipRequestModal extends StatefulWidget {
  const MembershipRequestModal({
    super.key,
    required this.station,
    required this.client,
    required this.onMembershipRequested,
  });

  final Station station;
  final ApiClient client;
  
  /// Called after successful membership request to refresh parent state.
  final VoidCallback onMembershipRequested;

  @override
  State<MembershipRequestModal> createState() => _MembershipRequestModalState();
}

class _MembershipRequestModalState extends State<MembershipRequestModal> {
  static const _olive = Color(0xFF5B5A3D);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);

  String _membershipStatus = 'unknown'; // 'none' | 'pending' | 'member' | 'unknown'
  bool _loading = true;
  bool _requesting = false;

  String get _statusLabel {
    switch (_membershipStatus) {
      case 'none':
        return 'Not a member';
      case 'pending':
        return 'Pending approval';
      case 'member':
        return 'Member';
      default:
        return 'Status unavailable';
    }
  }

  bool get _canRequestMembership =>
      _membershipStatus == 'none' || _membershipStatus == 'unknown';

  @override
  void initState() {
    super.initState();
    _fetchMembershipStatus();
  }

  Future<void> _fetchMembershipStatus() async {
    try {
      debugPrint('Fetching membership status for station ${widget.station.id}...');
      final status = await widget.client.fetchMembershipStatus(widget.station.id);
      if (!mounted) return;
      setState(() {
        _membershipStatus = status;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _membershipStatus = 'unknown';
        _loading = false;
      });
    }
  }

  Future<void> _requestMembership() async {
    final messenger = ScaffoldMessenger.of(context);
    
    Navigator.of(context).pop();

    try {
      debugPrint('Requesting membership for station ${widget.station.id}');
      // The API call happens silently here. The parent UI will remain completely static.
      await widget.client.createMembershipRequest(widget.station.id);
      
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Membership request sent to station admins.'),
        ),
      );
      
      widget.onMembershipRequested();
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handlebar
          Container(
            width: 42,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFE1DED7),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 20),

          // Station icon + name
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F0EC),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.lock_outline_rounded,
                  color: _olive,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.station.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: _text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.station.id,
                      style: const TextStyle(
                        color: _muted,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Status or Loading
          if (_loading)
            const SizedBox(
              height: 40,
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Column(
              children: [
                // Membership status badge
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F0EC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Membership: $_statusLabel',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _text,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Request button when membership does not already exist.
                if (_canRequestMembership)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: _olive,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: _requesting ? null : _requestMembership,
                      child: _requesting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : const Text(
                              'Request Membership',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.grey,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: null,
                      child: Text(
                        _membershipStatus == 'pending'
                            ? 'Request pending'
                            : 'Already a member',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      foregroundColor: _text,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: Color(0xFFE1DED7)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'Close',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
