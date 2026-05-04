import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/core/extensions/string_extensions.dart';
import 'package:mobile_app/data/models/access_request.dart';
import 'package:mobile_app/data/models/locker.dart';
import 'package:mobile_app/data/models/station.dart';
import 'package:mobile_app/data/models/user_profile.dart';

void main() {
  test('UserProfile.fromJson fills safe defaults', () {
    print('Running model test: UserProfile.fromJson fills safe defaults');
    final profile = UserProfile.fromJson(const <String, dynamic>{});

    expect(profile.id, isEmpty);
    expect(profile.name, 'User');
    expect(profile.email, '-');
    expect(profile.role, '-');
  });

  test('Station.fromJson reads GeoJSON coordinates in lon-lat order', () {
    print('Running model test: Station.fromJson reads GeoJSON coordinates in lon-lat order');
    final station = Station.fromJson(const <String, dynamic>{
      '_id': 'station-1',
      'name': 'Central Station',
      'code': 'CS01',
      'location': {
        'coordinates': [79.8612, 6.9271],
      },
    });

    expect(station.id, 'station-1');
    expect(station.name, 'Central Station');
    expect(station.code, 'CS01');
    expect(station.longitude, 79.8612);
    expect(station.latitude, 6.9271);
  });

  test('Locker.fromJson maps booking state correctly', () {
    print('Running model test: Locker.fromJson maps booking state correctly');
    final locker = Locker.fromJson(const <String, dynamic>{
      '_id': 'locker-1',
      'code': 'L-12',
      'isBooked': true,
    });

    expect(locker.id, 'locker-1');
    expect(locker.code, 'L-12');
    expect(locker.isBooked, isTrue);
  });

  test('AccessRequest.fromJson unwraps nested station and locker objects', () {
    print('Running model test: AccessRequest.fromJson unwraps nested station and locker objects');
    final request = AccessRequest.fromJson(const <String, dynamic>{
      '_id': 'request-1',
      'stationId': {
        '_id': 'station-2',
        'name': 'North Hub',
      },
      'lockerId': {
        'code': 'LK-09',
      },
      'status': 'QUEUED',
      'note': 'Leave at reception',
      'createdAt': '2026-04-27T08:30:00.000Z',
    });

    expect(request.id, 'request-1');
    expect(request.stationId, 'station-2');
    expect(request.stationName, 'North Hub');
    expect(request.lockerCode, 'LK-09');
    expect(request.status, 'QUEUED');
    expect(request.note, 'Leave at reception');
    expect(request.createdAt, isNotNull);
  });

  test('NullableStringX.ifEmpty falls back for null or empty values', () {
    print('Running model test: NullableStringX.ifEmpty falls back for null or empty values');
    expect((null).ifEmpty('fallback'), 'fallback');
    expect(''.ifEmpty('fallback'), 'fallback');
    expect('value'.ifEmpty('fallback'), 'value');
  });
}