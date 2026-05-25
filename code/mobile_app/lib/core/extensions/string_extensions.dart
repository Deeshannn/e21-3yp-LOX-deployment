extension NullableStringX on String? {
  /// Returns [fallback] when the value is null or empty.
  String ifEmpty(String fallback) {
    final value = this;
    if (value == null || value.isEmpty) return fallback;
    return value;
  }
}