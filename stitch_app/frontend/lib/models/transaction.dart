/// Transaction data class.
/// All monetary values are integer cents.
class Transaction {
  final String id;
  final int amountCents;
  final String displayAmount;
  final String type;
  final String description;
  final String category;
  final String? referenceId;
  final String createdAt;

  const Transaction({
    required this.id,
    required this.amountCents,
    this.displayAmount = '',
    required this.type,
    required this.description,
    this.category = 'general',
    this.referenceId,
    required this.createdAt,
  });

  bool get isCredit => type == 'credit';
  bool get isDebit => type == 'debit';

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String? ?? '',
      amountCents: (json['amountCents'] as num?)?.toInt() ?? 0,
      displayAmount: json['displayAmount'] as String? ?? '',
      type: json['type'] as String? ?? 'credit',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'general',
      referenceId: json['referenceId'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'amountCents': amountCents,
      'displayAmount': displayAmount,
      'type': type,
      'description': description,
      'category': category,
      'referenceId': referenceId,
      'createdAt': createdAt,
    };
  }
}
