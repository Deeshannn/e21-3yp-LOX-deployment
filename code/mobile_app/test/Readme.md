# Mobile App Test Coverage

This folder contains the Flutter tests for the mobile app only. The tests are grouped by behavior so it is easy to see what each case validates.

## Test Files

### `widget_test.dart`
Widget-level coverage for the app flow and key screens:

- Verifies the app starts on the auth flow when no saved session exists.
- Verifies the auth tabs switch from login to register.
- Verifies login validation shows an error when email and password are empty.
- Verifies the home shell loads the empty-state UI and the profile tab content.

### `local_store_test.dart`
Local storage coverage for shared preferences:

- Verifies `loadBootstrap()` returns default values when nothing is saved.
- Verifies `saveBootstrap()` and `loadBootstrap()` round-trip the API base URL and token.
- Verifies saved location and selected station data are restored by `loadUiPrefs()`.

### `models_test.dart`
Model and utility coverage for data parsing and small helpers:

- Verifies `UserProfile.fromJson()` applies safe fallback values.
- Verifies `Station.fromJson()` reads GeoJSON coordinates in longitude-latitude order.
- Verifies `Locker.fromJson()` maps booking state correctly.
- Verifies `AccessRequest.fromJson()` unwraps nested station and locker objects.
- Verifies `NullableStringX.ifEmpty()` returns the fallback for null or empty values.

## Notes

- Test output includes short `print()` logs so each case is visible while the suite runs.
- These tests are scoped to the mobile app and do not include backend coverage.
