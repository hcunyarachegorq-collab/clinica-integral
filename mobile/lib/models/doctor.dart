import 'specialty.dart';

class DoctorSchedule {
  final String id;
  final int dayOfWeek; // 0: Domingo, 1: Lunes, ..., 6: Sábado
  final String startTime;
  final String endTime;
  final int slotDurationMinutes;

  DoctorSchedule({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.slotDurationMinutes = 30,
  });

  factory DoctorSchedule.fromJson(Map<String, dynamic> json) {
    return DoctorSchedule(
      id: json['id'] as String? ?? '',
      dayOfWeek: (json['dayOfWeek'] as num?)?.toInt() ?? 1,
      startTime: json['startTime'] as String? ?? '08:00',
      endTime: json['endTime'] as String? ?? '17:00',
      slotDurationMinutes:
          (json['slotDurationMinutes'] as num?)?.toInt() ?? 30,
    );
  }

  String get dayName {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado'
    ];
    if (dayOfWeek >= 0 && dayOfWeek < days.length) {
      return days[dayOfWeek];
    }
    return 'Día $dayOfWeek';
  }
}

class Doctor {
  final String id;
  final String userId;
  final String fullName;
  final String email;
  final String? phone;
  final String licenseNumber;
  final String? bio;
  final double consultationFee;
  final Specialty? specialty;
  final List<DoctorSchedule> schedules;

  Doctor({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.email,
    this.phone,
    required this.licenseNumber,
    this.bio,
    required this.consultationFee,
    this.specialty,
    this.schedules = const [],
  });

  factory Doctor.fromJson(Map<String, dynamic> json) {
    // Maneja respuesta aplanada o anidada
    String fullName = '';
    String email = '';
    String? phone;

    if (json['user'] != null && json['user'] is Map) {
      fullName = json['user']['fullName'] as String? ?? '';
      email = json['user']['email'] as String? ?? '';
      phone = json['user']['phone'] as String?;
    } else {
      fullName = json['fullName'] as String? ?? '';
      email = json['email'] as String? ?? '';
      phone = json['phone'] as String?;
    }

    Specialty? specialty;
    if (json['specialty'] != null && json['specialty'] is Map) {
      specialty =
          Specialty.fromJson(json['specialty'] as Map<String, dynamic>);
    }

    final schedulesList = <DoctorSchedule>[];
    if (json['schedules'] != null && json['schedules'] is List) {
      for (final s in json['schedules']) {
        if (s is Map<String, dynamic>) {
          schedulesList.add(DoctorSchedule.fromJson(s));
        }
      }
    }

    return Doctor(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      fullName: fullName,
      email: email,
      phone: phone,
      licenseNumber: json['licenseNumber'] as String? ?? '',
      bio: json['bio'] as String?,
      consultationFee: (json['consultationFee'] as num?)?.toDouble() ?? 0.0,
      specialty: specialty,
      schedules: schedulesList,
    );
  }

  String get specialtyName => specialty?.name ?? 'Medicina General';

  String get formattedFee => 'S/ ${consultationFee.toStringAsFixed(2)}';

  String get workingDaysSummary {
    if (schedules.isEmpty) return 'Consultar disponibilidad';
    final days = schedules.map((s) => s.dayName.substring(0, 3)).toSet().toList();
    return days.join(', ');
  }
}
