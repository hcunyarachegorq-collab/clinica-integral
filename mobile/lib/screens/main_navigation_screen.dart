import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
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
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: switchTab,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.medical_services_outlined),
            selectedIcon: Icon(Icons.medical_services_rounded),
            label: 'Doctores',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month_rounded),
            label: 'Mis Citas',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_edu_outlined),
            selectedIcon: Icon(Icons.history_edu_rounded),
            label: 'Historial',
          ),
        ],
      ),
    );
  }
}
