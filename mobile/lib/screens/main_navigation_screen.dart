import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/motion_widgets.dart';
import 'home/home_screen.dart';
import 'doctors/doctors_screen.dart';
import 'appointments/appointments_screen.dart';
import 'history/medical_history_screen.dart';
import 'doctor_mode/doctor_dashboard_screen.dart';
import 'nurse_mode/nurse_dashboard_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final int initialIndex;
  const MainNavigationScreen({super.key, this.initialIndex = 0});

  static MainNavigationScreenState? of(BuildContext context) {
    return context.findAncestorStateOfType<MainNavigationScreenState>();
  }

  @override
  State<MainNavigationScreen> createState() => MainNavigationScreenState();
}

class MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void switchTab(int index) {
    if (index >= 0 && index < 4) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    // Si el usuario autenticado tiene rol de DOCTOR, renderizar la experiencia médica móvil
    if (user != null && user.isDoctor) {
      return const DoctorDashboardScreen();
    }

    // Si el usuario autenticado tiene rol de ENFERMERÍA, renderizar la estación de enfermería móvil
    if (user != null && user.isNurse) {
      return const NurseDashboardScreen();
    }

    final screens = [
      HomeScreen(onNavigateTab: switchTab),
      const DoctorsScreen(),
      const AppointmentsScreen(),
      const MedicalHistoryScreen(),
    ];

    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: FloatingPillNavBar(
        currentIndex: _currentIndex,
        onTap: switchTab,
        items: const [
          FloatingPillNavItem(
            icon: Icons.home_outlined,
            selectedIcon: Icons.home_rounded,
            label: 'Inicio',
          ),
          FloatingPillNavItem(
            icon: Icons.medical_services_outlined,
            selectedIcon: Icons.medical_services_rounded,
            label: 'Doctores',
          ),
          FloatingPillNavItem(
            icon: Icons.calendar_month_outlined,
            selectedIcon: Icons.calendar_month_rounded,
            label: 'Mis Citas',
          ),
          FloatingPillNavItem(
            icon: Icons.history_edu_outlined,
            selectedIcon: Icons.history_edu_rounded,
            label: 'Historial',
          ),
        ],
      ),
    );
  }
}
