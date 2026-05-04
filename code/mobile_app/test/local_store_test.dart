import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile_app/core/constants/app_constants.dart';
import 'package:mobile_app/data/local/local_store.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('loadBootstrap returns defaults when nothing is saved', () async {
    print('Running local store test: loadBootstrap returns defaults when nothing is saved');
    final bootstrap = await LocalStore.loadBootstrap();

    expect(bootstrap.baseUrl, AppConstants.defaultApiBaseUrl);
    expect(bootstrap.token, isEmpty);
  });

  test('saveBootstrap and loadBootstrap round-trip values', () async {
    print('Running local store test: saveBootstrap and loadBootstrap round-trip values');
    await LocalStore.saveBootstrap(
      baseUrl: 'http://example.com/api',
      token: 'abc123',
    );

    final bootstrap = await LocalStore.loadBootstrap();

    expect(bootstrap.baseUrl, 'http://example.com/api');
    expect(bootstrap.token, 'abc123');
  });

  test('saveUiPrefs values are restored by loadUiPrefs', () async {
    print('Running local store test: saveUiPrefs values are restored by loadUiPrefs');
    await LocalStore.saveLocation('Colombo, Sri Lanka');
    await LocalStore.saveSelectedStation('station-42');

    final prefs = await LocalStore.loadUiPrefs();

    expect(prefs.savedLocation, 'Colombo, Sri Lanka');
    expect(prefs.selectedStationId, 'station-42');
  });
}