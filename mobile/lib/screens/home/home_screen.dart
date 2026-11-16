import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/appointment.dart';
import '../../models/specialty.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/animated_components.dart';
import '../notifications/notifications_sheet.dart';

class HomeScreen extends StatefulWidget {
  final Function(int) onNavigateTab;
  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  List<Specialty> _specialties = [];
  Appointment? _nextAppointment;
  int _unreadNotifs = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadNotificationsCount() async {
    try {
      final notifRes = await _apiClient.get('/api/notifications');
      if (notifRes is Map<String, dynamic> && mounted) {
        setState(() {
          _unreadNotifs = (notifRes['unreadCount'] as num?)?.toInt() ?? 0;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Cargar Especialidades
      final specResponse = await _apiClient.get('/api/specialties');
      final specialties = <Specialty>[];
      final List? rawList = specResponse is List
          ? specResponse
          : (specResponse is Map<String, dynamic> &&
                  specResponse['specialties'] is List)
              ? specResponse['specialties'] as List
              : null;
      if (rawList != null) {
        for (final item in rawList) {
          if (item is Map<String, dynamic>) {
            specialties.add(Specialty.fromJson(item));
          }
        }
      }

      // 2. Cargar Próxima Cita del Paciente
      Appointment? nextApp;
      try {
        final appResponse = await _apiClient.get('/api/appointments');
        if (appResponse is Map<String, dynamic> &&
            appResponse['appointments'] is List) {
          final list = (appResponse['appointments'] as List)
              .map((e) => Appointment.fromJson(e as Map<String, dynamic>))
              .where((a) => a.isPending || a.isConfirmed)
              .toList();

          list.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
          if (list.isNotEmpty) {
            nextApp = list.first;
          }
        }
      } catch (_) {
        // En caso de que no tenga citas o falle
      }

      // 3. Notificaciones no leídas
      int unread = 0;
      try {
        final notifRes = await _apiClient.get('/api/notifications');
        if (notifRes is Map<String, dynamic>) {
          unread = (notifRes['unreadCount'] as num?)?.toInt() ?? 0;
        }
      } catch (_) {}

      if (mounted) {
        setState(() {
          _specialties = specialties;
          _nextAppointment = nextApp;
          _unreadNotifs = unread;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  IconData _getSpecialtyIcon(String? iconName, [String? specialtyName]) {
    final key = '${iconName ?? ""} ${specialtyName ?? ""}'.toLowerCase();
    if (key.contains('heart-pulse') || key.contains('cardio')) {
      return Icons.favorite_rounded;
    } else if (key.contains('stethoscope') || key.contains('general')) {
      return Icons.medical_services_rounded;
    } else if (key.contains('baby') || key.contains('pedia')) {
      return Icons.child_care_rounded;
    } else if (key.contains('sparkles') ||
        key.contains('derma') ||
        key.contains('piel')) {
      return Icons.auto_awesome_rounded;
    } else if (key.contains('gyn') ||
        key.contains('gineco') ||
        key.contains('obste')) {
      return Icons.pregnant_woman_rounded;
    } else if (key.contains('bone') ||
        key.contains('trauma') ||
        key.contains('orto')) {
      return Icons.accessibility_new_rounded;
    } else if (key.contains('brain') ||
        key.contains('neuro') ||
        key.contains('cerebro')) {
      return Icons.psychology_rounded;
    } else if (key.contains('eye') ||
        key.contains('oftalmo') ||
        key.contains('ojo')) {
      return Icons.visibility_rounded;
    } else if (key.contains('smile') ||
        key.contains('odonto') ||
        key.contains('dental')) {
      return Icons.sentiment_very_satisfied_rounded;
    } else if (key.contains('activity') ||
        key.contains('gastro') ||
        key.contains('digest')) {
      return Icons.healing_rounded;
    } else if (key.contains('shield') ||
        key.contains('endocri') ||
        key.contains('tiroide')) {
      return Icons.shield_rounded;
    } else if (key.contains('ear') ||
        key.contains('otorrino') ||
        key.contains('oido')) {
      return Icons.hearing_rounded;
    }
    return Icons.health_and_safety_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final patientName = user?.fullName.split(' ').first ?? 'Paciente';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: _loadData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Encabezado con Saludo y Avatar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                '¡Hola, $patientName! 👋',
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const LivePulseBadge(label: 'En Línea'),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '¿Cómo te sientes el día de hoy?',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            NotificationsSheet.show(
                              context,
                              onUpdated: _loadNotificationsCount,
                            );
                          },
                          icon: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              const Icon(
                                Icons.notifications_outlined,
                                color: AppTheme.textPrimary,
                                size: 26,
                              ),
                              if (_unreadNotifs > 0)
                                Positioned(
                                  right: -2,
                                  top: -2,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: AppTheme.error,
                                      shape: BoxShape.circle,
                                    ),
                                    constraints: const BoxConstraints(
                                      minWidth: 16,
                                      minHeight: 16,
                                    ),
                                    child: Text(
                                      '$_unreadNotifs',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryLight,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: const Color(0xFFBAE6FD), width: 1.5),
                          ),
                          child: Center(
                            child: Text(
                              patientName.isNotEmpty
                                  ? patientName[0].toUpperCase()
                                  : 'P',
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Tarjeta de Próxima Cita
                const Text(
                  'Tu Próxima Cita',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),

                if (_isLoading)
                  const ShimmerAppointmentCard()
                else if (_nextAppointment != null)
                  FadeSlideEntry(
                    delay: const Duration(milliseconds: 60),
                    child: _buildNextAppointmentCard(_nextAppointment!),
                  )
                else
                  FadeSlideEntry(
                    delay: const Duration(milliseconds: 60),
                    child: _buildNoAppointmentCard(),
                  ),

                const SizedBox(height: 28),

                // Especialidades Médicas
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Especialidades Médicas',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    TextButton(
                      onPressed: () => widget.onNavigateTab(1), // Ir a Doctores
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.primary,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text('Ver todas'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (_isLoading && _specialties.isEmpty)
                  SizedBox(
                    height: 130,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: 3,
                      separatorBuilder: (context, index) =>
                          const SizedBox(width: 14),
                      itemBuilder: (context, index) {
                        return Container(
                          width: 115,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ShimmerBox(
                                  width: 44, height: 44, borderRadius: 22),
                              SizedBox(height: 10),
                              ShimmerBox(width: 70, height: 12),
                              SizedBox(height: 6),
                              ShimmerBox(width: 45, height: 10),
                            ],
                          ),
                        );
                      },
                    ),
                  )
                else if (_specialties.isEmpty)
                  const Text(
                    'No hay especialidades disponibles en este momento.',
                    style: TextStyle(color: AppTheme.textSecondary),
                  )
                else
                  SizedBox(
                    height: 130,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _specialties.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(width: 14),
                      itemBuilder: (context, index) {
                        final specialty = _specialties[index];
                        return _buildSpecialtyCard(specialty);
                      },
                    ),
                  ),

                const SizedBox(height: 28),

                // Banner de Acción Rápida: Agendar Cita
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, Color(0xFF0369A1)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.25),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '¿Necesitas una consulta médica?',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Elige a tu especialista y agenda un turno en pocos segundos.',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 14),
                            ElevatedButton(
                              onPressed: () => widget.onNavigateTab(1),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppTheme.primary,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 10,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: const Text(
                                'Agendar Turno',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.calendar_today_rounded,
                          color: Colors.white,
                          size: 36,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNextAppointmentCard(Appointment app) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.access_time_rounded,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              app.formattedDate,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            Text(
                              app.formattedTime,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: app.statusBackgroundColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    app.statusLabel,
                    style: TextStyle(
                      color: app.statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 24, color: AppTheme.border),
            Row(
              children: [
                Hero(
                  tag: 'doctor_avatar_${app.doctorId}',
                  child: const CircleAvatar(
                    backgroundColor: Color(0xFFF1F5F9),
                    child: Icon(
                      Icons.person_rounded,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        app.doctorFullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        app.doctorSpecialty,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.secondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => widget.onNavigateTab(2), // Ir a Mis Citas
                  style: OutlinedButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: Size.zero,
                  ),
                  child: const Text('Ver Cita', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoAppointmentCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.event_available_rounded,
                color: AppTheme.textSecondary,
                size: 28,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'No tienes citas próximas',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Agenda una consulta médica preventiva hoy.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => widget.onNavigateTab(1),
              icon: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
              color: AppTheme.primary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecialtyCard(Specialty specialty) {
    return BouncyButton(
      onTap: () => widget.onNavigateTab(1),
      child: Container(
        width: 115,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: AppTheme.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getSpecialtyIcon(specialty.iconName, specialty.name),
                color: AppTheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              specialty.name,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${specialty.doctorsCount} médicos',
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
