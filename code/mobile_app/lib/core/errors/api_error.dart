class ApiError implements Exception {
  const ApiError(this.message);

  final String message;

  @override
  String toString() => message;
}