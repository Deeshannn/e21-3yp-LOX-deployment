class ProductColor {
  const ProductColor({required this.name, required this.value});

  final String name;
  final String value;

  factory ProductColor.fromJson(Map<String, dynamic> json) {
    return ProductColor(
      name: json['name']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'name': name, 'value': value};
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.compareAtPrice,
    required this.deliveryDays,
    required this.deliveryFee,
    required this.deliveryLabel,
    required this.badge,
    required this.rating,
    required this.reviews,
    required this.sold,
    required this.stock,
    required this.description,
    required this.imageUrl,
    required this.features,
    required this.colors,
    required this.artStyle,
    required this.featured,
  });

  final String id;
  final String name;
  final String category;
  final double price;
  final double compareAtPrice;
  final int deliveryDays;
  final double deliveryFee;
  final String deliveryLabel;
  final String badge;
  final double rating;
  final int reviews;
  final int sold;
  final int stock;
  final String description;
  final String imageUrl;
  final List<String> features;
  final List<ProductColor> colors;
  final String artStyle;
  final bool featured;

  factory Product.fromJson(Map<String, dynamic> json) {
    final rawFeatures = json['features'] as List<dynamic>? ?? const [];
    final feat = rawFeatures.map((item) => item.toString()).toList();

    final rawColors = json['colors'] as List<dynamic>? ?? const [];
    final col = rawColors
        .map((item) => ProductColor.fromJson(item as Map<String, dynamic>))
        .toList();

    return Product(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      compareAtPrice: (json['compareAtPrice'] as num?)?.toDouble() ?? 0.0,
      deliveryDays: (json['deliveryDays'] as num?)?.toInt() ?? 3,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      deliveryLabel: json['deliveryLabel']?.toString() ?? 'Fast delivery',
      badge: json['badge']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.7,
      reviews: (json['reviews'] as num?)?.toInt() ?? 0,
      sold: (json['sold'] as num?)?.toInt() ?? 0,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      description: json['description']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      features: feat,
      colors: col,
      artStyle: json['artStyle']?.toString() ?? 'rfid',
      featured: json['featured'] == true,
    );
  }
}
