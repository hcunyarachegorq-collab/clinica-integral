import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  String? _selectedSpecialtyId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  String _getContextualGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) {
      return '¡Buenos días';
    } else if (hour >= 12 && hour < 19) {
      return '¡Buenas tardes';
    } else {
      return '¡Buenas noches';
    }
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

  void _showLabInfoModal() {
    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(Icons.biotech_rounded, color: Color(0xFF6366F1)),
            SizedBox(width: 10),
            Text('Laboratorio Clínico'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Servicio integral de análisis clínicos de precisión:',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            SizedBox(height: 12),
            Text('• Hemograma automatizado y Bioquímica'),
            SizedBox(height: 4),
            Text('• Perfil Lipídico, Glucosa y HbA1c'),
            SizedBox(height: 4),
            Text('• Uroanálisis, Cultivos e Inmunología'),
            SizedBox(height: 12),
            Text(
              'Los resultados validados se anexan directamente a tu expediente digital.',
              style: TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: Color(0xFF4F46E5),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  void _showWaitingRoomModal() {
    HapticFeedback.lightImpact();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(Icons.tv_rounded, color: Color(0xFF10B981)),
            SizedBox(width: 10),
            Text('Sala de Espera TV'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Nuestra Sala de Espera cuenta con pantalla TV de turnos y voceo en tiempo real.',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 14),
            if (_nextAppointment != null && _nextAppointment!.queueCode != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: Color(0xFF16A34A), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Tu turno activo es: ${_nextAppointment!.queueCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Color(0xFF166534),
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              const Text('No cuentas con citas en sala en este momento.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final patientName = user?.fullName.split(' ').first ?? 'Paciente';
    final greeting = _getContextualGreeting();

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
                // 1. HEADER DINÁMICO CON GRADIENTE CLÍNICO Y ONDAS SUAVES
                StaggeredSlideFade(
                  index: 0,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0284C7), Color(0xFF0D9488)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.28),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        // Ondas decorativas de fondo
                        Positioned(
                          right: -25,
                          top: -30,
                          child: Container(
                            width: 110,
                            height: 110,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 35,
                          bottom: -35,
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.06),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        '$greeting,',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                          color: Colors.white70,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const PulseBadge(
                                        label: 'En Línea',
                                        color: Colors.white,
                                        backgroundColor: Color(0x33FFFFFF),
                                        fontSize: 10,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$patientName 👋',
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    '¿Cómo te sientes el día de hoy?',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
                                    color: Colors.white,
                                    size: 26,
                                  ),
                                  if (_unreadNotifs > 0)
                                    Positioned(
                                      right: -2,
                                      top: -2,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFEF4444),
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
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.5),
                                  width: 1.5,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  patientName.isNotEmpty
                                      ? patientName[0].toUpperCase()
                                      : 'P',
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // 2. PRÓXIMO TURNO DESTACADO
                StaggeredSlideFade(
                  index: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Tu Próximo Turno',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          if (_nextAppointment != null)
                            GestureDetector(
                              onTap: () => widget.onNavigateTab(2),
                              child: const Text(
                                'Ver todas',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_isLoading)
                        const ShimmerAppointmentCard()
                      else if (_nextAppointment != null)
                        _buildNextAppointmentCard(_nextAppointment!)
                      else
                        _buildNoAppointmentCard(),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 3. ACCESOS RÁPIDOS ANIMADOS
                StaggeredSlideFade(
                  index: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Accesos Rápidos',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickActionButton(
                              icon: Icons.calendar_month_rounded,
                              label: 'Agendar Cita',
                              color: const Color(0xFF0284C7),
                              bgColor: const Color(0xFFE0F2FE),
                              onTap: () => widget.onNavigateTab(1),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              icon: Icons.receipt_long_rounded,
                              label: 'Mis Recetas',
                              color: const Color(0xFF0D9488),
                              bgColor: const Color(0xFFCCFBF1),
                              onTap: () => widget.onNavigateTab(3),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              icon: Icons.biotech_rounded,
                              label: 'Laboratorio',
                              color: const Color(0xFF6366F1),
                              bgColor: const Color(0xFFEEF2FF),
                              onTap: _showLabInfoModal,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              icon: Icons.tv_rounded,
                              label: 'Sala TV',
                              color: const Color(0xFF10B981),
                              bgColor: const Color(0xFFD1FAE5),
                              onTap: _showWaitingRoomModal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 26),

                // 4. ESPECIALIDADES MÉDICAS CON CHIPS ESCALABLES
                StaggeredSlideFade(
                  index: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                            onPressed: () => widget.onNavigateTab(1),
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.primary,
                              padding: EdgeInsets.zero,
                            ),
                            child: const Text('Ver todas'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      if (_isLoading && _specialties.isEmpty)
                        SizedBox(
                          height: 125,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: 4,
                            separatorBuilder: (context, index) =>
                                const SizedBox(width: 12),
                            itemBuilder: (context, index) {
                              return Container(
                                width: 110,
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
                      else ...[
                        SizedBox(
                          height: 125,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _specialties.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(width: 12),
                            itemBuilder: (context, index) {
                              final specialty = _specialties[index];
                              return _buildSpecialtyCard(specialty);
                            },
                          ),
                        ),
                        // Vista previa interactiva con AnimatedSwitcher al tocar una especialidad
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: _selectedSpecialtyId != null
                              ? Container(
                                  key: ValueKey(_selectedSpecialtyId),
                                  margin: const EdgeInsets.only(top: 12),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF0FDFA),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                        color: const Color(0xFF99F6E4)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle_rounded,
                                          size: 18, color: Color(0xFF0F766E)),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Especialidad seleccionada: ${_specialties.firstWhere((s) => s.id == _selectedSpecialtyId).name}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF0F766E),
                                          ),
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: () => widget.onNavigateTab(1),
                                        style: TextButton.styleFrom(
                                          padding: EdgeInsets.zero,
                                          minimumSize: Size.zero,
                                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        ),
                                        child: const Text('Ver médicos →',
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // 5. BANNER INFORMATIVO CLÍNICO
                StaggeredSlideFade(
                  index: 4,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
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
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Elige tu especialista y agenda un turno en pocos segundos.',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  height: 1.35,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ElevatedButton(
                                onPressed: () => widget.onNavigateTab(1),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF0284C7),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 9,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: const Text(
                                  'Agendar Turno',
                                  style: TextStyle(
                                    fontSize: 12.5,
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
                            color: Colors.white.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.calendar_today_rounded,
                            color: Color(0xFF38BDF8),
                            size: 32,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return BouncyButton(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
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
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
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
            if (app.queueCode != null && app.queueCode!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F766E).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      'Turno: ${app.queueCode}',
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w900,
                        fontSize: 12.5,
                        color: Color(0xFF0F766E),
                      ),
                    ),
                    if (app.consultingRoom != null && app.consultingRoom!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text(
                        '• ${app.consultingRoom}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (app.calledAt != null)
                      const PulseBadge(
                        label: '¡LLAMANDO AHORA!',
                        color: Color(0xFFEF4444),
                        fontSize: 9.5,
                      )
                    else if (app.isConfirmed)
                      const PulseBadge(
                        label: 'Turno Activo',
                        color: Color(0xFF0284C7),
                        fontSize: 9.5,
                      )
                    else
                      const Text(
                        'En sala',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ],
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
    final isSelected = _selectedSpecialtyId == specialty.id;

    return BouncyButton(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _selectedSpecialtyId = isSelected ? null : specialty.id;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 115,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF0284C7) : AppTheme.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? const Color(0xFF0284C7).withValues(alpha: 0.15)
                  : Colors.black.withValues(alpha: 0.02),
              blurRadius: isSelected ? 12 : 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFE0F2FE)
                    : AppTheme.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getSpecialtyIcon(specialty.iconName, specialty.name),
                color: isSelected ? const Color(0xFF0284C7) : AppTheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              specialty.name,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected
                    ? const Color(0xFF0284C7)
                    : AppTheme.textPrimary,
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
