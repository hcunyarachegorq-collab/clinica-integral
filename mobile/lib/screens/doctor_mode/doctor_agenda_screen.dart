import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/appointment.dart';
import '../notifications/notifications_sheet.dart';

class DoctorAgendaScreen extends StatefulWidget {
  const DoctorAgendaScreen({super.key});

  @override
  State<DoctorAgendaScreen> createState() => _DoctorAgendaScreenState();
}

class _DoctorAgendaScreenState extends State<DoctorAgendaScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  List<Appointment> _allAppointments = [];
  String _selectedFilter = 'TODOS';
  final Map<String, bool> _actionLoading = {};
  int _unreadNotifs = 0;

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

      if (response is Map<String, dynamic> &&
          response['appointments'] is List) {
        for (final item in response['appointments']) {
          list.add(Appointment.fromJson(item as Map<String, dynamic>));
        }
      }

      // Ordenar por fecha de atención
      list.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

      int unread = 0;
      try {
        final notifRes = await _apiClient.get('/api/notifications');
        if (notifRes is Map<String, dynamic>) {
          unread = (notifRes['unreadCount'] as num?)?.toInt() ?? 0;
        }
      } catch (_) {}

      if (mounted) {
        setState(() {
          _allAppointments = list;
          _unreadNotifs = unread;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateAppointmentStatus(
      String appointmentId, String newStatus) async {
    setState(() {
      _actionLoading[appointmentId] = true;
    });

    try {
      await _apiClient.patch(
        '/api/appointments/$appointmentId/status',
        body: {'status': newStatus},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newStatus == 'CONFIRMED'
                  ? '¡Cita confirmada exitosamente!'
                  : 'Cita cancelada.',
            ),
            backgroundColor:
                newStatus == 'CONFIRMED' ? AppTheme.success : AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadAppointments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al actualizar cita: $e'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _actionLoading[appointmentId] = false;
        });
      }
    }
  }

  List<Appointment> get _filteredAppointments {
    if (_selectedFilter == 'TODOS') return _allAppointments;
    return _allAppointments
        .where((a) => a.status == _selectedFilter)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final pendingCount =
        _allAppointments.where((a) => a.isPending).length;
    final confirmedCount =
        _allAppointments.where((a) => a.isConfirmed).length;
    final completedCount =
        _allAppointments.where((a) => a.isCompleted).length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Mi Agenda Médica'),
        actions: [
          IconButton(
            onPressed: () {
              NotificationsSheet.show(
                context,
                onUpdated: () async {
                  try {
                    final notifRes = await _apiClient.get('/api/notifications');
                    if (notifRes is Map<String, dynamic> && mounted) {
                      setState(() {
                        _unreadNotifs =
                            (notifRes['unreadCount'] as num?)?.toInt() ?? 0;
                      });
                    }
                  } catch (_) {}
                },
              );
            },
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.notifications_outlined),
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
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadAppointments,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAppointments,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // KPIs SUPERIORES
              Row(
                children: [
                  _buildKpiCard(
                    title: 'Total Citas',
                    count: _allAppointments.length,
                    color: AppTheme.primary,
                    bgColor: const Color(0xFFF0FDFA),
                  ),
                  const SizedBox(width: 8),
                  _buildKpiCard(
                    title: 'Pendientes',
                    count: pendingCount,
                    color: const Color(0xFFD97706),
                    bgColor: const Color(0xFFFEF3C7),
                  ),
                  const SizedBox(width: 8),
                  _buildKpiCard(
                    title: 'Confirmadas',
                    count: confirmedCount,
                    color: const Color(0xFF0284C7),
                    bgColor: const Color(0xFFE0F2FE),
                  ),
                  const SizedBox(width: 8),
                  _buildKpiCard(
                    title: 'Listas',
                    count: completedCount,
                    color: const Color(0xFF059669),
                    bgColor: const Color(0xFFD1FAE5),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // FILTROS HORIZONTALES
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('TODOS', 'Todas (${_allAppointments.length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('PENDING', 'Pendientes ($pendingCount)'),
                    const SizedBox(width: 8),
                    _buildFilterChip('CONFIRMED', 'Confirmadas ($confirmedCount)'),
                    const SizedBox(width: 8),
                    _buildFilterChip('COMPLETED', 'Completadas ($completedCount)'),
                    const SizedBox(width: 8),
                    _buildFilterChip(
                      'CANCELLED',
                      'Canceladas (${_allAppointments.where((a) => a.isCancelled).length})',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // LISTADO DE CITAS
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 50),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_errorMessage != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            size: 44, color: AppTheme.error),
                        const SizedBox(height: 12),
                        Text('Error al cargar la agenda: $_errorMessage'),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadAppointments,
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              else if (_filteredAppointments.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 50),
                    child: Column(
                      children: const [
                        Icon(
                          Icons.event_available_rounded,
                          size: 54,
                          color: AppTheme.textSecondary,
                        ),
                        SizedBox(height: 12),
                        Text(
                          'No hay citas con el filtro seleccionado',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Las citas programadas por tus pacientes aparecerán aquí.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _filteredAppointments.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final app = _filteredAppointments[index];
                    return _buildDoctorAppointmentCard(app);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required int count,
    required Color color,
    required Color bgColor,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppTheme.primary,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : AppTheme.textPrimary,
      ),
      onSelected: (_) {
        setState(() {
          _selectedFilter = filterKey;
        });
      },
    );
  }

  Widget _buildDoctorAppointmentCard(Appointment app) {
    final isBusy = _actionLoading[app.id] ?? false;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabecera: Fecha, Hora y Badges
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.access_time_filled_rounded,
                        size: 16,
                        color: AppTheme.primary,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          app.formattedDateTime,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Badges en Wrap para evitar cualquier desbordamiento
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: app.statusBackgroundColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    app.statusLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: app.statusColor,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: app.isPaid
                        ? const Color(0xFFD1FAE5)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    app.isPaid ? 'PAGADO' : 'PENDIENTE DE PAGO',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: app.isPaid
                          ? const Color(0xFF059669)
                          : const Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 20, color: AppTheme.border),

            // Datos del Paciente
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppTheme.primaryLight,
                  child: const Icon(
                    Icons.person_rounded,
                    size: 20,
                    color: AppTheme.primary,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        app.patientFullName ?? 'Paciente Asignado',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Motivo: ${app.reason}',
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

            // Signos Vitales del Triaje (si existen)
            if (app.triage != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDFA),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.monitor_heart_rounded,
                            size: 16, color: AppTheme.primary),
                        SizedBox(width: 6),
                        Text(
                          'Signos Vitales del Triaje:',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        _buildTriageItem('PA', app.triage!.bloodPressure),
                        _buildTriageItem(
                            'FC', '${app.triage!.heartRate} lpm'),
                        _buildTriageItem(
                            'Temp', '${app.triage!.temperature} °C'),
                        _buildTriageItem(
                            'SatO2', '${app.triage!.oxygenSaturation}%'),
                        _buildTriageItem(
                            'Peso', '${app.triage!.weightKg} kg'),
                        _buildTriageItem(
                            'Talla', '${app.triage!.heightCm} cm'),
                        if (app.triage!.heightCm > 0)
                          _buildTriageItem(
                            'IMC',
                            '${app.triage!.bmi.toStringAsFixed(1)} (${app.triage!.bmiCategory})',
                          ),
                      ],
                    ),
                    if (app.triage!.allergies != null &&
                        app.triage!.allergies!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Text(
                          '⚠️ Alergias: ${app.triage!.allergies!}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFB91C1C),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            // Acciones Rápidas del Médico
            if (app.isPending || app.isConfirmed) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  if (app.isPending) ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: isBusy
                            ? null
                            : () => _updateAppointmentStatus(
                                app.id, 'CONFIRMED'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: isBusy
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_rounded, size: 16),
                        label: const Text(
                          'Confirmar',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: isBusy
                          ? null
                          : () async {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('¿Cancelar Cita?'),
                                  content: Text(
                                    '¿Confirmas que deseas cancelar la cita de ${app.patientFullName ?? "este paciente"}?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.of(ctx).pop(false),
                                      child: const Text('No'),
                                    ),
                                    ElevatedButton(
                                      onPressed: () =>
                                          Navigator.of(ctx).pop(true),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.error,
                                        foregroundColor: Colors.white,
                                      ),
                                      child: const Text('Sí, Cancelar'),
                                    ),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                await _updateAppointmentStatus(
                                    app.id, 'CANCELLED');
                              }
                            },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.error,
                        side: const BorderSide(color: AppTheme.error),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: const Icon(Icons.cancel_rounded, size: 16),
                      label: const Text(
                        'Cancelar',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTriageItem(String label, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label: ',
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
