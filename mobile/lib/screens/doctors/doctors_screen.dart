import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/doctor.dart';
import '../../models/specialty.dart';
import '../../widgets/animated_components.dart';
import '../appointments/book_appointment_screen.dart';

class DoctorsScreen extends StatefulWidget {
  final String? initialSpecialtyId;
  const DoctorsScreen({super.key, this.initialSpecialtyId});

  @override
  State<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends State<DoctorsScreen> {
  final ApiClient _apiClient = ApiClient();
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  List<Doctor> _allDoctors = [];
  List<Doctor> _filteredDoctors = [];
  List<Specialty> _specialties = [];
  String? _selectedSpecialtyId;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedSpecialtyId = widget.initialSpecialtyId;
    _loadData();
    _searchController.addListener(_applyFilters);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
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

      // 2. Cargar Doctores
      final docResponse = await _apiClient.get('/api/doctors');
      final doctors = <Doctor>[];
      if (docResponse is Map<String, dynamic> &&
          docResponse['doctors'] is List) {
        for (final item in docResponse['doctors']) {
          doctors.add(Doctor.fromJson(item as Map<String, dynamic>));
        }
      }

      if (mounted) {
        setState(() {
          _specialties = specialties;
          _allDoctors = doctors;
          _isLoading = false;
        });
        _applyFilters();
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

  void _applyFilters() {
    final query = _searchController.text.trim().toLowerCase();
    setState(() {
      _filteredDoctors = _allDoctors.where((doc) {
        final matchesQuery = query.isEmpty ||
            doc.fullName.toLowerCase().contains(query) ||
            doc.specialtyName.toLowerCase().contains(query);

        final matchesSpecialty = _selectedSpecialtyId == null ||
            doc.specialty?.id == _selectedSpecialtyId;

        return matchesQuery && matchesSpecialty;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Staff Médico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadData,
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de Búsqueda
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar por médico o especialidad...',
                prefixIcon:
                    const Icon(Icons.search_rounded, color: AppTheme.primary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 20),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),

          // Filtro por Chips de Especialidad
          if (_specialties.isNotEmpty)
            Container(
              color: Colors.white,
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('Todas'),
                      selected: _selectedSpecialtyId == null,
                      onSelected: (selected) {
                        setState(() {
                          _selectedSpecialtyId = null;
                        });
                        _applyFilters();
                      },
                    ),
                  ),
                  ..._specialties.map((spec) {
                    final isSelected = _selectedSpecialtyId == spec.id;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(spec.name),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            _selectedSpecialtyId = selected ? spec.id : null;
                          });
                          _applyFilters();
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),

          const Divider(height: 1, color: AppTheme.border),

          // Lista de Médicos
          Expanded(
            child: _isLoading
                ? ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: 4,
                    separatorBuilder: (context, index) => const SizedBox(height: 14),
                    itemBuilder: (context, index) => const ShimmerDoctorCard(),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline_rounded,
                                size: 48, color: AppTheme.error),
                            const SizedBox(height: 12),
                            Text('Error al cargar médicos: $_errorMessage'),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadData,
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      )
                    : _filteredDoctors.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.person_search_rounded,
                                    size: 52, color: AppTheme.textSecondary),
                                SizedBox(height: 12),
                                Text(
                                  'No se encontraron médicos disponibles',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Prueba ajustando los filtros de búsqueda.',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadData,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredDoctors.length,
                              separatorBuilder: (context, index) =>
                                  const SizedBox(height: 14),
                              itemBuilder: (context, index) {
                                final doctor = _filteredDoctors[index];
                                return StaggeredSlideFade(
                                  index: index,
                                  child: _buildDoctorCard(doctor),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildDoctorCard(Doctor doctor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Hero(
                  tag: 'doctor_avatar_${doctor.id}',
                  child: CircleAvatar(
                    radius: 26,
                    backgroundColor: AppTheme.primaryLight,
                    child: Text(
                      doctor.fullName.isNotEmpty
                          ? doctor.fullName.split(' ').first[0]
                          : 'D',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Hero(
                        tag: 'doctor_name_${doctor.id}',
                        child: Material(
                          color: Colors.transparent,
                          child: Text(
                            doctor.fullName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              doctor.specialtyName,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primary,
                              ),
                            ),
                          ),
                          Text(
                            'CMP: ${doctor.licenseNumber}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          if (doctor.reviewCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: const Color(0xFFFDE68A)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.star_rounded,
                                    size: 13,
                                    color: Color(0xFFD97706),
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    '${doctor.averageRating.toStringAsFixed(1)} (${doctor.reviewCount})',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFB45309),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  doctor.formattedFee,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
            if (doctor.bio != null && doctor.bio!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                doctor.bio!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDFA),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AppTheme.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.schedule_rounded,
                      size: 14, color: AppTheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      doctor.workingDaysSummary,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            BouncyButton(
              onTap: () {
                Navigator.of(context).push(
                  SlideFadePageRoute(
                    page: BookAppointmentScreen(doctor: doctor),
                  ),
                );
              },
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      SlideFadePageRoute(
                        page: BookAppointmentScreen(doctor: doctor),
                      ),
                    );
                  },
                  icon: const Icon(Icons.event_available_rounded, size: 18),
                  label: const Text('Agendar Cita'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
