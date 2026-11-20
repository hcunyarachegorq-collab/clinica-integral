import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/appointment.dart';
import '../../widgets/animated_components.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  List<Appointment> _allAppointments = [];
  List<Appointment> _filteredAppointments = [];
  String _selectedFilter = 'ALL'; // ALL, PENDING, CONFIRMED, COMPLETED, CANCELLED
  String? _errorMessage;

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

      // Ordenar por fecha programada descendente (más recientes primero)
      list.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));

      if (mounted) {
        setState(() {
          _allAppointments = list;
          _isLoading = false;
        });
        _applyFilter();
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

  void _applyFilter() {
    setState(() {
      if (_selectedFilter == 'ALL') {
        _filteredAppointments = _allAppointments;
      } else {
        _filteredAppointments = _allAppointments
            .where((app) => app.status == _selectedFilter)
            .toList();
      }
    });
  }

  Future<void> _cancelAppointment(Appointment app) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('¿Cancelar esta cita médica?'),
        content: Text(
          'Se cancelará tu cita del día ${app.formattedDate} a las ${app.formattedTime} con el Dr. ${app.doctorFullName}. Esta acción liberará el horario.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No, mantener'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Sí, Cancelar Cita'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _apiClient.patch('/api/appointments/${app.id}/status', body: {
        'status': 'CANCELLED',
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('La cita ha sido cancelada exitosamente.'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadAppointments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _openReviewDialog(Appointment app) async {
    int rating = 5;
    final commentController = TextEditingController();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.star_rounded, color: Color(0xFFD97706), size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Calificar Atención',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Dr(a). ${app.doctorFullName}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                const Center(
                  child: Text(
                    '¿Cómo calificarías tu experiencia?',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (index) {
                      final starValue = index + 1;
                      return BouncyButton(
                        onTap: () {
                          setDialogState(() {
                            rating = starValue;
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          child: Icon(
                            starValue <= rating
                                ? Icons.star_rounded
                                : Icons.star_outline_rounded,
                            color: const Color(0xFFD97706),
                            size: 34,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                Center(
                  child: Text(
                    rating == 1
                        ? '1 / 5 - Muy insatisfecho'
                        : rating == 2
                            ? '2 / 5 - Insatisfecho'
                            : rating == 3
                                ? '3 / 5 - Regular'
                                : rating == 4
                                    ? '4 / 5 - Buena atención'
                                    : '5 / 5 - ¡Excelente atención!',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFB45309),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Comentario u opinión (opcional):',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: commentController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Cuéntanos qué tal fue tu experiencia médica...',
                    hintStyle: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final nav = Navigator.of(ctx);
                      final messenger = ScaffoldMessenger.of(context);
                      setDialogState(() {
                        isSubmitting = true;
                      });
                      try {
                        await _apiClient.post(
                          '/api/appointments/${app.id}/review',
                          body: {
                            'rating': rating,
                            'comment': commentController.text.trim().isEmpty
                                ? null
                                : commentController.text.trim(),
                          },
                        );
                        nav.pop();
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('¡Gracias por calificar la atención!'),
                            backgroundColor: AppTheme.success,
                          ),
                        );
                        _loadAppointments();
                      } catch (err) {
                        setDialogState(() {
                          isSubmitting = false;
                        });
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(err.toString()),
                            backgroundColor: AppTheme.error,
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                foregroundColor: Colors.white,
              ),
              child: isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Enviar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Mis Citas Médicas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadAppointments,
          ),
        ],
      ),
      body: Column(
        children: [
          // Selector de Estados (Filtros)
          Container(
            color: Colors.white,
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _buildFilterChip('Todas', 'ALL'),
                _buildFilterChip('Pendientes', 'PENDING'),
                _buildFilterChip('Confirmadas', 'CONFIRMED'),
                _buildFilterChip('Completadas', 'COMPLETED'),
                _buildFilterChip('Canceladas', 'CANCELLED'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),

          // Contenido Principal
          Expanded(
            child: _isLoading
                ? ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    separatorBuilder: (context, index) => const SizedBox(height: 14),
                    itemBuilder: (context, index) => const ShimmerAppointmentCard(),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline_rounded,
                                size: 48, color: AppTheme.error),
                            const SizedBox(height: 12),
                            Text('Error: $_errorMessage'),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadAppointments,
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      )
                    : _filteredAppointments.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.event_busy_rounded,
                                  size: 52,
                                  color: AppTheme.textSecondary,
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'No tienes citas en esta categoría',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Tus citas programadas aparecerán aquí.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadAppointments,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredAppointments.length,
                              separatorBuilder: (context, index) =>
                                  const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final app = _filteredAppointments[index];
                                return StaggeredSlideFade(
                                  index: index,
                                  child: _buildAppointmentCard(app),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _selectedFilter = value;
        });
        _applyFilter();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFCBD5E1),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF475569),
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(Appointment app) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabecera: Fecha / Hora (fila superior con Expanded)
            Row(
              children: [
                const Icon(Icons.event_rounded,
                    size: 16, color: AppTheme.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    app.formattedDateTime,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Badges de estado con Wrap para auto-ajuste responsivo sin desbordamiento
            Wrap(
              spacing: 8,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Badge Estado Cita
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: app.statusBackgroundColor,
                    borderRadius: BorderRadius.circular(12),
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
                // Badge Estado Pago
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: app.isPaid
                        ? const Color(0xFFD1FAE5)
                        : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    app.isPaid ? 'PAGADO' : 'PENDIENTE',
                    style: TextStyle(
                      color: app.isPaid
                          ? const Color(0xFF047857)
                          : const Color(0xFFB45309),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // Badge Código de Turno (Bloque B)
                if (app.queueCode != null && app.queueCode!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F766E).withValues(alpha: 0.12),
                      border: Border.all(
                        color: const Color(0xFF14B8A6).withValues(alpha: 0.35),
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF14B8A6),
                            shape: BoxShape.circle,
                          ),
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
                // Badge Consultorio
                if (app.consultingRoom != null && app.consultingRoom!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.blueGrey.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      app.consultingRoom!,
                      style: const TextStyle(
                        color: Colors.blueGrey,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                // Badge Estado de Llamado
                if (app.calledAt != null)
                  const PulseBadge(
                    label: '¡LLAMANDO AHORA!',
                    color: Color(0xFFEF4444),
                    fontSize: 9.5,
                  )
                else if (app.isConfirmed && app.queueCode != null)
                  const PulseBadge(
                    label: 'Turno Activo',
                    color: Color(0xFF0284C7),
                    fontSize: 9.5,
                  ),
              ],
            ),
            const Divider(height: 20, color: AppTheme.border),

            // Info del Doctor
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primaryLight,
                  child: const Icon(Icons.person_rounded,
                      color: AppTheme.primary),
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
                          fontSize: 15,
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
                Text(
                  'S/ ${app.consultationFee.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Motivo
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Motivo de Consulta:',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    app.reason,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),

            // Triaje si existe
            if (app.triage != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.monitor_heart_rounded,
                        color: Color(0xFF16A34A), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Triaje: PA ${app.triage!.bloodPressure} • ${app.triage!.heartRate} lpm • ${app.triage!.temperature}°C • IMC ${app.triage!.bmi.toStringAsFixed(1)} (${app.triage!.bmiCategory})',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Reseña del Paciente si ya calificó
            if (app.review != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: Color(0xFFD97706), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Tu Calificación: ${app.review!.rating} / 5${app.review!.comment != null && app.review!.comment!.isNotEmpty ? ' • "${app.review!.comment}"' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Botón Calificar Consulta si está COMPLETADA y sin reseña
            if (app.isCompleted && app.review == null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _openReviewDialog(app),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  icon: const Icon(Icons.star_outline_rounded, size: 16),
                  label: const Text(
                    'Calificar Consulta',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ),
            ],

            // Botón Cancelar si está activa
            if (app.canBeCancelled) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _cancelAppointment(app),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.error,
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  icon: const Icon(Icons.cancel_outlined, size: 16),
                  label: const Text('Cancelar Cita'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
