import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/appointment.dart';
import '../../models/medical_record.dart';
import '../../services/pdf_recipe_service.dart';
import '../../widgets/animated_components.dart';
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
  Map<String, MedicalRecord> _recordsByAppointmentId = {};
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

      // Cargar expedientes médicos asociados al doctor para vincularlos a citas COMPLETADAS
      final recordsMap = <String, MedicalRecord>{};
      try {
        final recRes = await _apiClient.get('/api/medical-records');
        if (recRes is Map<String, dynamic> &&
            recRes['medicalRecords'] is List) {
          for (final item in recRes['medicalRecords']) {
            final rec = MedicalRecord.fromJson(item as Map<String, dynamic>);
            if (rec.appointmentId.isNotEmpty) {
              recordsMap[rec.appointmentId] = rec;
            }
          }
        }
      } catch (recErr) {
        debugPrint('Error al cargar expedientes médicos del doctor: $recErr');
      }

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
          _recordsByAppointmentId = recordsMap;
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

  Future<void> _callPatientToRoom(Appointment app) async {
    setState(() {
      _actionLoading[app.id] = true;
    });

    try {
      final room = app.consultingRoom ?? 'Consultorio 1';
      final res = await _apiClient.patch(
        '/api/appointments/${app.id}/call',
        body: {'consultingRoom': room},
      );

      if (mounted) {
        final message = (res is Map<String, dynamic> && res['message'] != null)
            ? res['message'].toString()
            : '¡Paciente llamado a Sala TV y Notificado!';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.campaign_rounded,
                    color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(message)),
              ],
            ),
            backgroundColor: const Color(0xFF0284C7),
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadAppointments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al llamar al paciente: $e'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _actionLoading[app.id] = false;
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
        title: Row(
          children: const [
            Text('Mi Agenda Médica'),
            SizedBox(width: 8),
            LivePulseBadge(
              label: 'Activa',
              color: AppTheme.primary,
              fontSize: 10,
            ),
          ],
        ),
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
              FadeSlideEntry(
                delay: const Duration(milliseconds: 60),
                child: Row(
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
                Column(
                  children: List.generate(
                    4,
                    (i) => const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: ShimmerAppointmentCard(),
                    ),
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
                    return FadeSlideEntry(
                      delay: Duration(milliseconds: 35 * index),
                      child: _buildDoctorAppointmentCard(app),
                    );
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
                if (app.queueCode != null && app.queueCode!.isNotEmpty)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F766E).withValues(alpha: 0.12),
                      border: Border.all(
                        color: const Color(0xFF14B8A6).withValues(alpha: 0.35),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.confirmation_number_outlined,
                          size: 12,
                          color: Color(0xFF0F766E),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Turno: ${app.queueCode}',
                          style: const TextStyle(
                            color: Color(0xFF0F766E),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                if (app.consultingRoom != null &&
                    app.consultingRoom!.isNotEmpty)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3E8FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      app.consultingRoom!,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF7E22CE),
                      ),
                    ),
                  ),
                if (app.calledAt != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF0284C7)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.campaign_rounded,
                            size: 12, color: Color(0xFF0284C7)),
                        SizedBox(width: 4),
                        Text(
                          'LLAMADO',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0284C7),
                          ),
                        ),
                      ],
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

            // Acciones Rápidas del Médico (PENDING / CONFIRMED)
            if (app.isPending || app.isConfirmed) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  if (app.isPending) ...[
                    Expanded(
                      child: BouncyButton(
                        onTap: isBusy
                            ? null
                            : () => _updateAppointmentStatus(
                                app.id, 'CONFIRMED'),
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
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (app.isConfirmed) ...[
                    Expanded(
                      child: BouncyButton(
                        onTap: isBusy ? null : () => _callPatientToRoom(app),
                        child: ElevatedButton.icon(
                          onPressed:
                              isBusy ? null : () => _callPatientToRoom(app),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: app.calledAt != null
                                ? const Color(0xFF0D9488)
                                : const Color(0xFF0284C7),
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
                              : const Icon(Icons.campaign_rounded, size: 16),
                          label: Text(
                            app.calledAt != null
                                ? 'Volver a Llamar'
                                : 'Llamar Turno',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: BouncyButton(
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
                  ),
                ],
              ),
            ],

            // Detalle Clínico, Receta y Resumen Económico (COMPLETED)
            if (app.isCompleted) ...[
              const SizedBox(height: 14),
              _buildCompletedAppointmentSection(app),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompletedAppointmentSection(Appointment app) {
    final record = _recordsByAppointmentId[app.id];
    final consultationFee = app.consultationFee;
    final pharmacyTotal = record?.pharmacyTotal ?? 0.0;
    final labTotal = record?.labOrders.fold<double>(
            0.0, (sum, item) => sum + item.price) ??
        0.0;
    final grandTotal = consultationFee + pharmacyTotal + labTotal;
    final hasRestDays =
        record != null && record.restDays != null && record.restDays! > 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Diagnóstico Emitido Compacto
        if (record != null && record.diagnosis.isNotEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.biotech_rounded,
                  size: 16,
                  color: Color(0xFF16A34A),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Diagnóstico Emitido:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF15803D),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        record.diagnosis,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF166534),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Resumen Económico Compacto
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(
                          Icons.monetization_on_outlined,
                          size: 14,
                          color: AppTheme.primary,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Total Facturado de la Atención:',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Consulta: S/ ${consultationFee.toStringAsFixed(2)} | Botica: S/ ${pharmacyTotal.toStringAsFixed(2)} | Lab: S/ ${labTotal.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF10B981)),
                ),
                child: Text(
                  'S/ ${grandTotal.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF065F46),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Botones de Acción con BouncyButton
        Row(
          children: [
            Expanded(
              child: BouncyButton(
                onTap: () => _showMedicalRecordDetailBottomSheet(
                  context,
                  app,
                  record,
                ),
                child: OutlinedButton.icon(
                  onPressed: () => _showMedicalRecordDetailBottomSheet(
                    context,
                    app,
                    record,
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primary,
                    side: const BorderSide(color: AppTheme.primary),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  icon: const Icon(Icons.assignment_outlined, size: 16),
                  label: const Text(
                    'Ver Expediente',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: BouncyButton(
                onTap: record != null
                    ? () async {
                        try {
                          await PdfRecipeService.printPrescription(
                            record: record,
                            patientNameFallback: app.patientFullName,
                          );
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Error al generar Receta PDF: $e'),
                                backgroundColor: AppTheme.error,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        }
                      }
                    : null,
                child: ElevatedButton.icon(
                  onPressed: record != null
                      ? () async {
                          try {
                            await PdfRecipeService.printPrescription(
                              record: record,
                              patientNameFallback: app.patientFullName,
                            );
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content:
                                      Text('Error al generar Receta PDF: $e'),
                                  backgroundColor: AppTheme.error,
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  icon: const Icon(Icons.picture_as_pdf_rounded, size: 16),
                  label: const Text(
                    'Receta PDF',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),

        // Si tiene descanso médico, botón adicional destacado
        if (hasRestDays) ...[
          const SizedBox(height: 8),
          BouncyButton(
            onTap: () async {
              try {
                await PdfRecipeService.printRestCertificate(
                  record: record,
                  patientNameFallback: app.patientFullName,
                );
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error al generar Certificado: $e'),
                      backgroundColor: AppTheme.error,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF047857),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.health_and_safety_rounded,
                      size: 16, color: Colors.white),
                  SizedBox(width: 6),
                  Text(
                    'Descanso Médico (PDF)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  void _showMedicalRecordDetailBottomSheet(
    BuildContext context,
    Appointment app,
    MedicalRecord? record,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DoctorRecordDetailModal(
        appointment: app,
        record: record,
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

class _DoctorRecordDetailModal extends StatelessWidget {
  final Appointment appointment;
  final MedicalRecord? record;

  const _DoctorRecordDetailModal({
    required this.appointment,
    this.record,
  });

  @override
  Widget build(BuildContext context) {
    final consultationFee = appointment.consultationFee;
    final pharmacyTotal = record?.pharmacyTotal ?? 0.0;
    final labTotal = record?.labOrders.fold<double>(
            0.0, (sum, item) => sum + item.price) ??
        0.0;
    final grandTotal = consultationFee + pharmacyTotal + labTotal;
    final hasRestDays =
        record != null && record!.restDays != null && record!.restDays! > 0;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.88,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Grabber
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),

              // Cabecera del Modal
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.medical_information_rounded,
                        color: AppTheme.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Expediente de Atención Médica',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(
                                appointment.formattedDateTime,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textSecondary,
                                ),
                              ),
                              if (appointment.queueCode != null &&
                                  appointment.queueCode!.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0F766E)
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'Turno: ${appointment.queueCode}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0F766E),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppTheme.border),

              // Contenido con Scroll
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Datos del Paciente
                      _buildPatientSection(),
                      const SizedBox(height: 16),

                      // 2. Signos Vitales del Triaje (si existen)
                      if (appointment.triage != null) ...[
                        _buildTriageSection(appointment.triage!),
                        const SizedBox(height: 16),
                      ],

                      // 3. Diagnóstico y Notas Clínicas
                      _buildDiagnosisSection(),
                      const SizedBox(height: 16),

                      // 4. Medicamentos de Botica Interna
                      _buildPharmacySection(),
                      const SizedBox(height: 16),

                      // 5. Órdenes de Laboratorio e Imágenes
                      _buildLabOrdersSection(),
                      const SizedBox(height: 16),

                      // 6. Certificado de Descanso Médico
                      if (hasRestDays) ...[
                        _buildRestCertificateSection(),
                        const SizedBox(height: 16),
                      ],

                      // 7. Resumen Económico Consolidado
                      _buildBillingSummarySection(
                        consultationFee: consultationFee,
                        pharmacyTotal: pharmacyTotal,
                        labTotal: labTotal,
                        grandTotal: grandTotal,
                      ),
                      const SizedBox(height: 20),

                      // 8. Botones de Acción Oficial (PDFs)
                      _buildPdfActionButtons(context, hasRestDays),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPatientSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppTheme.primaryLight,
            child: const Icon(Icons.person_rounded,
                size: 22, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment.patientFullName ?? 'Paciente Asignado',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Motivo: ${appointment.reason}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                if (appointment.consultingRoom != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Atendido en: ${appointment.consultingRoom}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF7E22CE),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTriageSection(Triage triage) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDFA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
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
                'Triaje y Signos Vitales Registrados:',
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
              _buildTriageTag('PA', triage.bloodPressure),
              _buildTriageTag('FC', '${triage.heartRate} lpm'),
              _buildTriageTag('Temp', '${triage.temperature} °C'),
              _buildTriageTag('SatO2', '${triage.oxygenSaturation}%'),
              _buildTriageTag('Peso', '${triage.weightKg} kg'),
              _buildTriageTag('Talla', '${triage.heightCm} cm'),
              if (triage.heightCm > 0)
                _buildTriageTag(
                  'IMC',
                  '${triage.bmi.toStringAsFixed(1)} (${triage.bmiCategory})',
                ),
            ],
          ),
          if (triage.allergies != null && triage.allergies!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                '⚠️ Alergias Conocidas: ${triage.allergies!}',
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
    );
  }

  Widget _buildTriageTag(String label, String value) {
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

  Widget _buildDiagnosisSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.biotech_rounded, size: 16, color: Color(0xFF16A34A)),
              SizedBox(width: 6),
              Text(
                'Diagnóstico Clínico Principal:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF15803D),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            record?.diagnosis ?? 'Diagnóstico registrado en la atención',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF14532D),
              height: 1.3,
            ),
          ),
          if (record?.notes != null && record!.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Notas Clínicas: ${record!.notes!}',
              style: const TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: Color(0xFF166534),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPharmacySection() {
    final items = record?.prescriptionItems ?? [];
    final pharmacyPaid = record?.pharmacyPaid ?? false;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.medication_rounded,
                      size: 16, color: Color(0xFF2563EB)),
                  SizedBox(width: 6),
                  Text(
                    'Botica Interna & Tratamiento:',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E40AF),
                    ),
                  ),
                ],
              ),
              if (items.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: pharmacyPaid
                        ? const Color(0xFFD1FAE5)
                        : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: pharmacyPaid
                          ? const Color(0xFF10B981)
                          : const Color(0xFFF59E0B),
                    ),
                  ),
                  child: Text(
                    pharmacyPaid ? 'PAGADO EN BOTICA' : 'PENDIENTE EN CAJA',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: pharmacyPaid
                          ? const Color(0xFF065F46)
                          : const Color(0xFFB45309),
                    ),
                  ),
                ),
            ],
          ),
          if (record?.prescription != null &&
              record!.prescription.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              record!.prescription,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF1E3A8A),
                height: 1.3,
              ),
            ),
          ],
          if (items.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFDBEAFE)),
              ),
              child: Column(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF1F5F9),
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(8)),
                    ),
                    child: Row(
                      children: const [
                        Expanded(
                          flex: 3,
                          child: Text(
                            'Medicamento / Posología',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Text(
                            'Cant.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 1,
                          child: Text(
                            'Subtotal',
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ...items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${item.medicationName} (${item.medicationPresentation})',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                if (item.dosage.isNotEmpty)
                                  Text(
                                    item.dosage,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Expanded(
                            flex: 1,
                            child: Text(
                              '${item.quantity}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 1,
                            child: Text(
                              'S/ ${item.subtotal.toStringAsFixed(2)}',
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E40AF),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLabOrdersSection() {
    final orders = record?.labOrders ?? [];
    if (orders.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDFA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF99F6E4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.science_rounded,
                  size: 16, color: Color(0xFF0D9488)),
              const SizedBox(width: 6),
              Text(
                'Órdenes de Laboratorio & Diagnóstico (${orders.length}):',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F766E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Column(
            children: orders.map((lo) {
              final isCompleted = lo.status == 'COMPLETED';
              final isInProgress = lo.status == 'IN_PROGRESS';
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCCFBF1)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${lo.code} • ${lo.name}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          Text(
                            '${lo.category} • S/ ${lo.price.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          if (lo.resultSummary != null &&
                              lo.resultSummary!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                'Resultado: ${lo.resultSummary}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontStyle: FontStyle.italic,
                                  color: Color(0xFF0D9488),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isCompleted
                            ? const Color(0xFFDCFCE7)
                            : isInProgress
                                ? const Color(0xFFFEF3C7)
                                : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isCompleted
                              ? const Color(0xFF86EFAC)
                              : isInProgress
                                  ? const Color(0xFFFDE68A)
                                  : const Color(0xFFCBD5E1),
                        ),
                      ),
                      child: Text(
                        isCompleted
                            ? 'Listo'
                            : isInProgress
                                ? 'En Proceso'
                                : 'Pendiente',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: isCompleted
                              ? const Color(0xFF15803D)
                              : isInProgress
                                  ? const Color(0xFFB45309)
                                  : const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildRestCertificateSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFD1FAE5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.health_and_safety_rounded,
              color: Color(0xFF047857),
              size: 22,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Certificado de Descanso: ${record!.restDays} Días',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF064E3B),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${record!.restStartDate != null ? 'Desde: ${record!.restStartDate} ' : ''}${record!.restEndDate != null ? '• Hasta: ${record!.restEndDate} ' : ''}${record!.cie10Code != null ? '• CIE-10: ${record!.cie10Code}' : ''}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF047857),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingSummarySection({
    required double consultationFee,
    required double pharmacyTotal,
    required double labTotal,
    required double grandTotal,
  }) {
    final consultationPaid = appointment.isPaid;
    final pharmacyPaid = record?.pharmacyPaid ?? false;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.receipt_long_rounded,
                  size: 16, color: AppTheme.primary),
              SizedBox(width: 6),
              Text(
                'Desglose Económico de la Atención:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildBillingRow(
            'Consulta Médica Especializada',
            consultationFee,
            consultationPaid ? 'PAGADO' : 'PENDIENTE',
            consultationPaid
                ? const Color(0xFF15803D)
                : const Color(0xFFB45309),
          ),
          if (pharmacyTotal > 0)
            _buildBillingRow(
              'Medicamentos Formulados (Botica)',
              pharmacyTotal,
              pharmacyPaid ? 'PAGADO' : 'PENDIENTE',
              pharmacyPaid
                  ? const Color(0xFF15803D)
                  : const Color(0xFFB45309),
            ),
          if (labTotal > 0)
            _buildBillingRow(
              'Órdenes de Laboratorio / Imágenes',
              labTotal,
              'FACTURADO',
              const Color(0xFF0284C7),
            ),
          const Divider(height: 16, color: Color(0xFFCBD5E1)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TOTAL FACTURADO:',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                'S/ ${grandTotal.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBillingRow(
      String label, double amount, String badge, Color badgeColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  badge,
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'S/ ${amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPdfActionButtons(BuildContext context, bool hasRestDays) {
    if (record == null) return const SizedBox.shrink();

    return Column(
      children: [
        BouncyButton(
          onTap: () async {
            try {
              await PdfRecipeService.printPrescription(
                record: record!,
                patientNameFallback: appointment.patientFullName,
              );
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error al generar Receta PDF: $e'),
                    backgroundColor: AppTheme.error,
                  ),
                );
              }
            }
          },
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.picture_as_pdf_rounded,
                    size: 18, color: Colors.white),
                SizedBox(width: 8),
                Text(
                  'Imprimir / Compartir Receta PDF',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (hasRestDays) ...[
          const SizedBox(height: 10),
          BouncyButton(
            onTap: () async {
              try {
                await PdfRecipeService.printRestCertificate(
                  record: record!,
                  patientNameFallback: appointment.patientFullName,
                );
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error al generar Certificado: $e'),
                      backgroundColor: AppTheme.error,
                    ),
                  );
                }
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF047857),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.health_and_safety_rounded,
                      size: 18, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Imprimir Certificado de Descanso PDF',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

