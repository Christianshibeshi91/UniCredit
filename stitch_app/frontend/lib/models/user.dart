/// User data class.
/// All monetary values are integer cents.
class User {
  final String id;
  final String name;
  final String email;
  final int balanceCents;
  final String tier;
  final String role;
  final String? photoUrl;
  final String authProvider;
  final String createdAt;
  final String? lastLoginAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.balanceCents = 0,
    this.tier = 'STANDARD',
    this.role = 'user',
    this.photoUrl,
    this.authProvider = 'email',
    this.createdAt = '',
    this.lastLoginAt,
  });

  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      balanceCents: (json['balanceCents'] as num?)?.toInt() ?? 0,
      tier: json['tier'] as String? ?? 'STANDARD',
      role: json['role'] as String? ?? 'user',
      photoUrl: json['photoUrl'] as String?,
      authProvider: json['authProvider'] as String? ?? 'email',
      createdAt: json['createdAt'] as String? ?? '',
      lastLoginAt: json['lastLoginAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'balanceCents': balanceCents,
      'tier': tier,
      'role': role,
      'photoUrl': photoUrl,
      'authProvider': authProvider,
      'createdAt': createdAt,
      'lastLoginAt': lastLoginAt,
    };
  }

  User copyWith({
    String? name,
    String? email,
    int? balanceCents,
    String? tier,
    String? role,
    String? photoUrl,
  }) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      balanceCents: balanceCents ?? this.balanceCents,
      tier: tier ?? this.tier,
      role: role ?? this.role,
      photoUrl: photoUrl ?? this.photoUrl,
      authProvider: authProvider,
      createdAt: createdAt,
      lastLoginAt: lastLoginAt,
    );
  }
}
