import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../data/models/product.dart';
import '../../../../../data/models/order.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import 'product_detail_screen.dart';

class StoreScreen extends StatefulWidget {
  const StoreScreen({
    super.key,
    required this.client,
    required this.user,
  });

  final ApiClient client;
  final UserProfile user;

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  // UI Tabs State
  int _activeSubTab = 0; // 0: Marketplace, 1: Order History

  // Store Data State
  List<Product> _products = [];
  List<Order> _orders = [];
  bool _loading = false;
  String? _error;

  // Search & Filters State
  String _searchQuery = '';
  String _selectedCategory = 'All';
  String _sortMode = 'best-match'; // best-match, price-low, price-high, top-rated, best-seller

  @override
  void initState() {
    super.initState();
    _loadStoreData();
  }

  Future<void> _loadStoreData() async {
    if (mounted) setState(() => _loading = true);
    try {
      final products = await widget.client.fetchProducts();
      final orders = await widget.client.fetchOrders();
      if (mounted) {
        setState(() {
          _products = products;
          _orders = orders;
          _error = null;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  List<String> get _categories {
    final list = _products.map((p) => p.category).toSet().toList();
    list.sort();
    return ['All', ...list];
  }

  List<Product> get _filteredProducts {
    var list = _products.where((p) {
      final query = _searchQuery.toLowerCase().trim();
      final matchesSearch = query.isEmpty ||
          p.name.toLowerCase().contains(query) ||
          p.description.toLowerCase().contains(query) ||
          p.category.toLowerCase().contains(query);

      final matchesCategory =
          _selectedCategory == 'All' || p.category == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();

    // Sorting
    if (_sortMode == 'price-low') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortMode == 'price-high') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (_sortMode == 'top-rated') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    } else if (_sortMode == 'best-seller') {
      list.sort((a, b) => b.sold.compareTo(a.sold));
    }

    return list;
  }

  void _openProduct(Product product) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          client: widget.client,
          product: product,
          user: widget.user,
        ),
      ),
    );
    if (result == true) {
      _loadStoreData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Section Tabs Selector
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
              child: Container(
                height: 44,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.fieldBackground,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _buildSubTabButton('MARKETPLACE', 0),
                    ),
                    Expanded(
                      child: _buildSubTabButton('ORDER HISTORY', 1),
                    ),
                  ],
                ),
              ),
            ),

            // Main body
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadStoreData,
                child: _loading && _products.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(_error!, textAlign: TextAlign.center),
                                  const SizedBox(height: 12),
                                  ElevatedButton(
                                    onPressed: _loadStoreData,
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : _activeSubTab == 0
                            ? _buildMarketplaceCatalog()
                            : _buildOrderHistory(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubTabButton(String label, int index) {
    final selected = _activeSubTab == index;
    return GestureDetector(
      onTap: () => setState(() => _activeSubTab = index),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
            color: selected ? AppColors.textMain : AppColors.textMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildMarketplaceCatalog() {
    final filtered = _filteredProducts;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        // Search Input
        Container(
          margin: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.fieldBackground,
            borderRadius: BorderRadius.circular(14),
          ),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            style: const TextStyle(fontWeight: FontWeight.w600),
            decoration: const InputDecoration(
              hintText: 'Search products...',
              prefixIcon: Icon(Icons.search, color: AppColors.textLabel),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            ),
          ),
        ),

        // Sort Row Selector
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Sort by',
              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLabel),
            ),
            DropdownButton<String>(
              value: _sortMode,
              underline: const SizedBox(),
              icon: const Icon(Icons.arrow_drop_down, color: AppColors.olive),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.olive),
              onChanged: (val) {
                if (val != null) setState(() => _sortMode = val);
              },
              items: const [
                DropdownMenuItem(value: 'best-match', child: Text('Best Match')),
                DropdownMenuItem(value: 'price-low', child: Text('Price: Low to High')),
                DropdownMenuItem(value: 'price-high', child: Text('Price: High to Low')),
                DropdownMenuItem(value: 'top-rated', child: Text('Top Rated')),
                DropdownMenuItem(value: 'best-seller', child: Text('Best Sellers')),
              ],
            ),
          ],
        ),

        // Category Pills
        SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _categories.map((cat) {
              final isSel = _selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(
                    cat,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: isSel ? Colors.white : AppColors.textLabel,
                    ),
                  ),
                  selected: isSel,
                  selectedColor: AppColors.olive,
                  backgroundColor: AppColors.fieldBackground,
                  checkmarkColor: Colors.white,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 16),

        // Products Catalog Grid
        if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 64),
            child: Center(
              child: Text(
                'No products found matching filters.',
                style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLabel),
              ),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.74,
            ),
            itemBuilder: (context, index) {
              final product = filtered[index];
              return _buildProductCard(product);
            },
          ),

        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildProductCard(Product product) {
    final hasComparePrice = product.compareAtPrice > product.price;

    return GestureDetector(
      onTap: () => _openProduct(product),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.black.withOpacity(0.05)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.fieldBackground.withOpacity(0.4),
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: _buildProductImage(product, size: 48),
                      ),
                      if (product.badge.isNotEmpty)
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.olive,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              product.badge.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.category.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textLabel,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textMain,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Rs. ${product.price.round()}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: AppColors.olive,
                            ),
                          ),
                          if (hasComparePrice)
                            Text(
                              'Rs. ${product.compareAtPrice.round()}',
                              style: const TextStyle(
                                fontSize: 11,
                                decoration: TextDecoration.lineThrough,
                                color: AppColors.textMuted,
                              ),
                            ),
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Color(0xFFF1C40F), size: 14),
                          const SizedBox(width: 2),
                          Text(
                            product.rating.toString(),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMain,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
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

  Widget _buildProductImage(Product product, {double size = 48}) {
    final imageUrl = product.imageUrl.trim();
    if (imageUrl.isEmpty) {
      return _buildFallbackIcon(product, size);
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return Image.network(
        imageUrl,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(product, size),
      );
    }

    if (imageUrl.startsWith('data:image/svg+xml')) {
      try {
        String svgString;
        if (imageUrl.contains(';base64,')) {
          final base64Str = imageUrl.split(';base64,')[1];
          svgString = utf8.decode(base64.decode(base64Str));
        } else {
          final parts = imageUrl.split(',');
          if (parts.length > 1) {
            svgString = Uri.decodeComponent(parts.sublist(1).join(','));
          } else {
            svgString = '';
          }
        }
        if (svgString.isNotEmpty) {
          return SvgPicture.string(
            svgString,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
          );
        }
      } catch (_) {}
    }

    if (imageUrl.startsWith('data:image/') && imageUrl.contains(';base64,')) {
      try {
        final base64Str = imageUrl.split(';base64,')[1];
        final bytes = base64.decode(base64Str);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
        );
      } catch (_) {}
    }

    // Try decoding as raw base64
    try {
      final bytes = base64.decode(imageUrl);
      return Image.memory(
        bytes,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } catch (_) {}

    return _buildFallbackIcon(product, size);
  }

  Widget _buildFallbackIcon(Product product, double size) {
    return Center(
      child: Icon(
        _getArtIcon(product.artStyle),
        size: size,
        color: AppColors.olive.withOpacity(0.7),
      ),
    );
  }

  Widget _buildOrderHistory() {
    if (_orders.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 120),
          Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textMuted),
          SizedBox(height: 10),
          Center(
            child: Text(
              'No checkout orders yet.',
              style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textLabel),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        final isPaid = order.status == 'PAID';
        final isPending = order.status == 'PENDING';
        final isFailed = order.status == 'FAILED';

        Color badgeBg = const Color(0xFFF3E9E8);
        Color badgeText = const Color(0xFFB85C58);
        if (isPaid) {
          badgeBg = const Color(0xFFE4ECE5);
          badgeText = AppColors.olive;
        } else if (isPending) {
          badgeBg = const Color(0xFFFEF3C7);
          badgeText = const Color(0xFFD97706);
        }

        return Card(
          elevation: 0,
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.black.withOpacity(0.06)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      order.productCategory.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textLabel,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        order.status,
                        style: TextStyle(
                          color: badgeText,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  order.productName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textMain,
                  ),
                ),
                if (order.selectedColor.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Color variant: ${order.selectedColor}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textLabel, fontWeight: FontWeight.w500),
                  ),
                ],
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Qty: ${order.quantity} • Rs. ${order.unitPrice.round()} each',
                      style: const TextStyle(color: AppColors.textLabel, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    Text(
                      'Total: Rs. ${order.amount.round()}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.textMain),
                    ),
                  ],
                ),
                if (isPending && order.checkoutUrl.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.olive,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () async {
                        final uri = Uri.parse(order.checkoutUrl);
                        if (await launchUrl(uri, mode: LaunchMode.externalApplication)) {
                          _loadStoreData();
                        }
                      },
                      child: const Text('Complete Payment', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
