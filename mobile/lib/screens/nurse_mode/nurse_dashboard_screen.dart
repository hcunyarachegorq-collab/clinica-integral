import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/appointment.dart';
import '../../providers/auth_provider.dart';
import '../profile/edit_profile_screen.dart';

class NurseDashboardScreen extends StatefulWidget {
  const NurseDashboardScreen({super.key});

  @override
  State<NurseDashboardScreen> createState() => _NurseDashboardScreenState();
}

class _NurseDashboardScreenState extends State<NurseDashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const _NurseAgendaTab(),
      const _NurseProfileTab(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment_rounded),
            label: 'Citas & Triaje',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Mi Perfil',
          ),
        ],
      ),
    );
  }
}

class _NurseAgendaTab extends StatefulWidget {
  const _NurseAgendaTab();

  @override
  State<_NurseAgendaTab> createState() => _NurseAgendaTabState();
}

class _NurseAgendaTabState extends State<_NurseAgendaTab> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  List<Appointment> _appointments = [];

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiClient.get('/api/appointments');
      final list = <Appointment>[];

      if (response is Map<String, dynamic> && response['appointments'] is List) {
        for (final item in response['appointments']) {
          list.add(Appointment.fromJson(item as Map<String, dynamic>));
        }
      }

      list.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

      setState(() {
        _appointments = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'No se pudieron cargar las citas para triaje.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final pendingCount = _appointments.where((a) => a.isPending).length;
    final confirmedCount = _appointments.where((a) => a.isConfirmed).length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Estación de Enfermería'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar Citas',
            onPressed: _loadAppointments,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAppointments,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            // ==========================================================
            // BANNER INFORMATIVO CLARO DE ENFERMERÍA Y TRIAJE
            // ==========================================================
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFE0F2FE),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFBAE6FD), width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x150284C7),
                    offset: Offset(0, 4),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.healing_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '¡Bienvenida, ${user?.fullName ?? "Enfermera"}!',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF0369A1),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Su estación asistencial de Triaje (signos vitales e IMC), Camillas/Boxes de Tópico y consulta de Laboratorio está disponible en el Portal Web para monitorización en vivo.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF0C4A6E),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Resumen de KPIs
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('En Espera', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          const SizedBox(height: 2),
                          Text(
                            '$pendingCount',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Confirmadas', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          const SizedBox(height: 2),
                          Text(
                            '$confirmedCount',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Hoy', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          const SizedBox(height: 2),
                          Text(
                            '${_appointments.length}',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0D9488)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Encabezado de Lista
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Citas Programadas para Triaje',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),

            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.error)),
                ),
              )
            else if (_appointments.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text(
                    'No hay citas registradas en este momento.',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                ),
              )
            else
              ..._appointments.map((app) {
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFCCFBF1),
                      child: const Icon(Icons.person_outline_rounded, color: Color(0xFF0F766E)),
                    ),
                    title: Text(
                      app.patientFullName ?? 'Paciente',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 2),
                        Text(
                          'Médico: ${app.doctorFullName} (${app.doctorSpecialty})',
                          style: const TextStyle(fontSize: 11.5, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: app.isConfirmed ? const Color(0xFFEFF6FF) : const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: app.isConfirmed ? const Color(0xFFBFDBFE) : const Color(0xFFFDE68A),
                                ),
                              ),
                              child: Text(
                                app.statusLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: app.isConfirmed ? const Color(0xFF1D4ED8) : const Color(0xFFB45309),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              app.formattedTime,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondary),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _NurseProfileTab extends StatelessWidget {
  const _NurseProfileTab();

  Future<void> _handleLogout(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Cerrar Sesión?'),
        content: const Text('Tendrás que volver a ingresar tus credenciales de Enfermería.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Perfil de Enfermería'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.error),
            tooltip: 'Cerrar Sesión',
            onPressed: () => _handleLogout(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 38,
                      backgroundColor: const Color(0xFFCCFBF1),
                      child: const Icon(Icons.healing_rounded, size: 40, color: Color(0xFF0F766E)),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.fullName ?? 'Lic. de Enfermería',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFBAE6FD)),
                      ),
                      child: const Text(
                        'Enfermería & Triaje',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.badge_outlined, color: Color(0xFF0284C7)),
                    title: const Text('Editar Perfil', style: TextStyle(fontSize: 14)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.logout_rounded, color: AppTheme.error),
                    title: const Text(
                      'Cerrar Sesión',
                      style: TextStyle(fontSize: 14, color: AppTheme.error, fontWeight: FontWeight.w600),
                    ),
                    onTap: () => _handleLogout(context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
