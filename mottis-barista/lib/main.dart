import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final authService = AuthService();
  await authService.init();

  runApp(
    ChangeNotifierProvider.value(
      value: authService,
      child: const MottisBarista(),
    ),
  );
}

class MottisBarista extends StatelessWidget {
  const MottisBarista({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Mottis Coffee Barista",
      debugShowCheckedModeBanner: false,
      theme: mottisTheme,
      home: Consumer<AuthService>(
        builder: (context, auth, _) {
          if (auth.isAuthenticated) return const MainShell();
          return const LoginScreen();
        },
      ),
    );
  }
}
