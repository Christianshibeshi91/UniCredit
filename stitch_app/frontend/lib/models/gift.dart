/// Gift data class.
/// All monetary values are integer cents.
class Gift {
  final String id;
  final String senderName;
  final String recipientEmail;
  final int amountCents;
  final String displayAmount;
  final String message;
  final String? occasion;
  final String status;
  final String? videoUrl;
  final String? audioUrl;
  final String? scheduledAt;
  final String? expiresAt;
  final String? claimedAt;
  final String createdAt;

  const Gift({
    required this.id,
    required this.senderName,
    required this.recipientEmail,
    required this.amountCents,
    this.displayAmount = '',
    this.message = '',
    this.occasion,
    required this.status,
    this.videoUrl,
    this.audioUrl,
    this.scheduledAt,
    this.expiresAt,
    this.claimedAt,
    required this.createdAt,
  });

  bool get isPending => status == 'pending';
  bool get isClaimed => status == 'claimed';
  bool get isExpired => status == 'expired';

  factory Gift.fromJson(Map<String, dynamic> json) {
    return Gift(
      id: json['id'] as String? ?? '',
      senderName: json['senderName'] as String? ?? '',
      recipientEmail: json['recipientEmail'] as String? ?? '',
      amountCents: (json['amountCents'] as num?)?.toInt() ?? 0,
      displayAmount: json['displayAmount'] as String? ?? '',
      message: json['message'] as String? ?? '',
      occasion: json['occasion'] as String?,
      status: json['status'] as String? ?? 'pending',
      videoUrl: json['videoUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      scheduledAt: json['scheduledAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      claimedAt: json['claimedAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderName': senderName,
      'recipientEmail': recipientEmail,
      'amountCents': amountCents,
      'displayAmount': displayAmount,
      'message': message,
      'occasion': occasion,
      'status': status,
      'videoUrl': videoUrl,
      'audioUrl': audioUrl,
      'scheduledAt': scheduledAt,
      'expiresAt': expiresAt,
      'claimedAt': claimedAt,
      'createdAt': createdAt,
    };
  }
}
