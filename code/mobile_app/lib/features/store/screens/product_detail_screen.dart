import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../data/models/product.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.client,
    required this.product,
    required this.user,
  });

  final ApiClient client;
  final Product product;
  final UserProfile user;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;
  String _selectedColor = '';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.product.colors.isNotEmpty) {
      _selectedColor = widget.product.colors.first.name;
    }
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _proceedToCheckout() async {
    if (widget.product.stock <= 0) {
      _show('This item is currently out of stock.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final res = await widget.client.createCheckoutSession(
        widget.product.id,
        _quantity,
        _selectedColor,
      );

      final urlStr = res['checkoutUrl']?.toString() ?? '';
      if (urlStr.isEmpty) {
        throw Exception('Server failed to return Stripe checkout URL');
      }

      final uri = Uri.parse(urlStr);
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (mounted) {
          _show('Opening Stripe checkout page...');
          Navigator.of(context).pop(true);
        }
      } else {
        throw Exception('Could not launch browser for Stripe checkout');
      }
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasCompare = widget.product.compareAtPrice > widget.product.price;
    final isOut = widget.product.stock <= 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textMain),
        title: Text(
          widget.product.category,
          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textMain),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  // Product Graphic Showcase
                  Container(
                    height: 200,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.fieldBackground.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.black.withOpacity(0.04)),
                    ),
                    child: Center(
                      child: Icon(
                        _getArtIcon(widget.product.artStyle),
                        size: 72,
                        color: AppColors.olive,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Header info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.product.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textMain,
                          ),
                        ),
                      ),
                      if (widget.product.badge.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.olive,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            widget.product.badge.toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Rating & Stock Row
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Color(0xFFF1C40F), size: 20),
                      const SizedBox(width: 4),
                      Text(
                        '${widget.product.rating} (${widget.product.reviews} reviews)',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textMain,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        isOut ? 'OUT OF STOCK' : 'IN STOCK (${widget.product.stock})',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: isOut ? const Color(0xFFB85C58) : AppColors.olive,
                        ),
                      ),
                    ],
                  ),

                  const Divider(height: 32),

                  // Price & Compare Price
                  Row(
                    children: [
                      Text(
                        'Rs. ${widget.product.price.round()}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: AppColors.olive,
                        ),
                      ),
                      if (hasCompare) ...[
                        const SizedBox(width: 10),
                        Text(
                          'Rs. ${widget.product.compareAtPrice.round()}',
                          style: const TextStyle(
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Colors list bubble selectors
                  if (widget.product.colors.isNotEmpty) ...[
                    const Text(
                      'CHOOSE COLOR',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: AppColors.textLabel,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      children: widget.product.colors.map((color) {
                        final isSel = _selectedColor == color.name;
                        Color circleColor = Colors.grey;
                        try {
                          final cleaned = color.value.replaceAll('#', '');
                          circleColor = Color(int.parse('FF$cleaned', radix: 16));
                        } catch (_) {}

                        return GestureDetector(
                          onTap: () => setState(() => _selectedColor = color.name),
                          child: Chip(
                            backgroundColor: isSel ? AppColors.fieldBackground : Colors.white,
                            side: BorderSide(
                              color: isSel ? AppColors.olive : Colors.black.withOpacity(0.06),
                              width: isSel ? 2 : 1,
                            ),
                            avatar: CircleAvatar(
                              backgroundColor: circleColor,
                              radius: 8,
                            ),
                            label: Text(
                              color.name,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: isSel ? AppColors.textMain : AppColors.textLabel,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Quantity adjust counters
                  const Text(
                    'QUANTITY',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: AppColors.textLabel,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.fieldBackground,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              onPressed: isOut || _quantity <= 1
                                  ? null
                                  : () => setState(() => _quantity--),
                              icon: const Icon(Icons.remove, size: 20),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              child: Text(
                                _quantity.toString(),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: isOut || _quantity >= widget.product.stock
                                  ? null
                                  : () => setState(() => _quantity++),
                              icon: const Icon(Icons.add, size: 20),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Description
                  const Text(
                    'DESCRIPTION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: AppColors.textLabel,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.product.description,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMain,
                      height: 1.4,
                    ),
                  ),

                  if (widget.product.features.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'KEY FEATURES',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: AppColors.textLabel,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...widget.product.features.map(
                      (f) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle_outline, color: AppColors.olive, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              f,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMain,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Delivery Info banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.fieldBackground.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.black.withOpacity(0.04)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_shipping_outlined, color: AppColors.olive, size: 24),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.product.deliveryLabel,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textMain,
                                ),
                              ),
                              Text(
                                'Est. Delivery: ${widget.product.deliveryDays} Days • Fee: Rs. ${widget.product.deliveryFee.round()}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textLabel,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),

            // Checkout action drawer bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.olive,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.olive.withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: isOut || _submitting ? null : _proceedToCheckout,
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          isOut ? 'OUT OF STOCK' : 'SECURE CHECKOUT',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getArtIcon(String style) {
    switch (style) {
      case 'rfid':
        return Icons.contactless_outlined;
      case 'book':
        return Icons.menu_book_outlined;
      case 'safe':
        return Icons.lock_outline;
      case 'drawer':
        return Icons.inbox_outlined;
      case 'wall':
        return Icons.domain_outlined;
      case 'coin':
        return Icons.monetization_on_outlined;
      default:
        return Icons.lock;
    }
  }
}
