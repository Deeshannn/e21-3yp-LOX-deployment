# Features

This directory contains the user-facing modules of the mobile app.

- `auth/`: Authentication flow screens (`AuthScreen`, login, register).
- `home/`: Post-login experience (`HomeScreen`) with Explore, Bookings, and Account tabs.

At app startup, session restoration decides which feature is shown first: unauthenticated users go to `auth`, and authenticated users go to `home`.
