class Order {
  const Order({
    required this.id,
    required this.userId,
    required this.productId,
    required this.productName,
    required this.productCategory,
    required this.selectedColor,
    required this.quantity,
    required this.unitPrice,
    required this.deliveryFee,
    required this.deliveryDays,
    required this.currency,
    required this.amount,
    required this.status,
    required this.stripeSessionId,
    required this.checkoutUrl,
    required this.notes,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String productId;
  final String productName;
  final String productCategory;
  final String selectedColor;
  final int quantity;
  final double unitPrice;
  final double deliveryFee;
  final int deliveryDays;
  final String currency;
  final double amount;
  final String status; // PENDING, PAID, FAILED, CANCELLED
  final String stripeSessionId;
  final String checkoutUrl;
  final String notes;
  final DateTime? createdAt;

  factory Order.fromJson(Map<String, dynamic> json) {
    final userVal = json['userId'];
    String uId = '';
    if (userVal is Map<String, dynamic>) {
      uId = userVal['_id']?.toString() ?? '';
    } else {
      uId = userVal?.toString() ?? '';
    }

    final productVal = json['productId'];
    String pId = '';
    if (productVal is Map<String, dynamic>) {
      pId = productVal['_id']?.toString() ?? '';
    } else {
      pId = productVal?.toString() ?? '';
    }

    return Order(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: uId,
      productId: pId,
      productName: json['productName']?.toString() ?? '',
      productCategory: json['productCategory']?.toString() ?? '',
      selectedColor: json['selectedColor']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      deliveryDays: (json['deliveryDays'] as num?)?.toInt() ?? 0,
      currency: json['currency']?.toString() ?? 'usd',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'PENDING',
      stripeSessionId: json['stripeSessionId']?.toString() ?? '',
      checkoutUrl: json['checkoutUrl']?.toString() ?? '',
      notes: json['notes']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }
}
