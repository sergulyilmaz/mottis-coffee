import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/qr_screen.dart';
import 'screens/stores_screen.dart';
import 'screens/profile_screen.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  // SharedPreferences onceden init et
  await SharedPreferences.getInstance();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const MottisApp(),
    ),
  );
}

class MottisApp extends StatelessWidget {
  const MottisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Mottis Coffee",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    return auth.isLoggedIn ? const MainShell() : const LoginScreen();
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _idx = 0;

  final _screens = const [
    HomeScreen(),
    MenuScreen(),
    QRScreen(),
    StoresScreen(),
    ProfileScreen(),
  ];

  final _labels = const ['Anasayfa', 'Menu', 'QR', 'Subeler', 'Profil'];
  final _icons = const [
    Icons.home_rounded,
    Icons.restaurant_menu_rounded,
    Icons.qr_code_rounded,
    Icons.location_on_rounded,
    Icons.person_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _idx, children: _screens),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: SafeArea(
          child: SizedBox(
            height: 68,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(5, (i) {
                if (i == 2) return _qrButton(); // Ortadaki QR butonu
                return _tabItem(i);
              }),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tabItem(int i) {
    final active = _idx == i;
    return GestureDetector(
      onTap: () => setState(() => _idx = i),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_icons[i], size: 24, color: active ? AppColors.primary : AppColors.textMuted),
            const SizedBox(height: 4),
            Text(
              _labels[i],
              style: TextStyle(
                fontSize: 10,
                color: active ? AppColors.primary : AppColors.textMuted,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qrButton() {
    return GestureDetector(
      onTap: () => setState(() => _idx = 2),
      child: Container(
        width: 56, height: 56,
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.4), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: const Icon(Icons.qr_code_rounded, size: 28, color: Colors.white),
      ),
    );
  }
}
