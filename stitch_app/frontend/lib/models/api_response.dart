/// Generic API response wrapper.
/// All API calls return this for consistent error handling.
class ApiResponse<T> {
  final T? data;
  final ApiError? error;
  final int statusCode;

  const ApiResponse({
    this.data,
    this.error,
    required this.statusCode,
  });

  bool get isSuccess => statusCode >= 200 && statusCode < 300;
  bool get isUnauthorized => statusCode == 401;
  bool get isRateLimited => statusCode == 429;
  bool get isServerError => statusCode >= 500;

  /// Create a success response.
  factory ApiResponse.success(T data, int statusCode) {
    return ApiResponse(data: data, statusCode: statusCode);
  }

  /// Create an error response.
  factory ApiResponse.error(ApiError error, int statusCode) {
    return ApiResponse(error: error, statusCode: statusCode);
  }

  /// Create a network error response.
  factory ApiResponse.networkError(String message) {
    return ApiResponse(
      error: ApiError(
        code: 'NETWORK_ERROR',
        message: message,
        requestId: '',
      ),
      statusCode: 0,
    );
  }
}

/// Structured API error matching backend format.
class ApiError {
  final String code;
  final String message;
  final String requestId;

  const ApiError({
    required this.code,
    required this.message,
    this.requestId = '',
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    final error = json['error'] as Map<String, dynamic>? ?? json;
    return ApiError(
      code: error['code'] as String? ?? 'UNKNOWN',
      message: error['message'] as String? ?? 'An error occurred',
      requestId: error['requestId'] as String? ?? '',
    );
  }

  @override
  String toString() => message;
}

/// Paginated response wrapper.
class PaginatedResponse<T> {
  final List<T> data;
  final String? nextCursor;
  final bool hasMore;
  final int limit;

  const PaginatedResponse({
    required this.data,
    this.nextCursor,
    required this.hasMore,
    required this.limit,
  });
}
