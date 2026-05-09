import 'package:flutter/material.dart';

/// Screen displaying the user's lockers and locker management options.
class MyLockersScreen extends StatefulWidget {
  const MyLockersScreen({super.key});

  @override
  State<MyLockersScreen> createState() => _MyLockersScreenState();
}

class _MyLockersScreenState extends State<MyLockersScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.lock_outline,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            const Text(
              'My Lockers',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'View and manage your locker assignments here.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
