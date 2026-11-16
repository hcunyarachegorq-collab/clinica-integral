import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class Triage {
  final String id;
  final String bloodPressure;
  final int heartRate;
  final double temperature;
  final double weightKg;
  final double heightCm;
  final int oxygenSaturation;
  final String? allergies;
  final String? notes;

  Triage({
    required this.id,
    required this.bloodPressure,
    required this.heartRate,
    required this.temperature,
    required this.weightKg,
    required this.heightCm,
    required this.oxygenSaturation,
    this.allergies,
    this.notes,
  });

  factory Triage.fromJson(Map<String, dynamic> json) {
    return Triage(
      id: json['id'] as String? ?? '',
      bloodPressure: json['bloodPressure'] as String? ?? '',
      heartRate: (json['heartRate'] as num?)?.toInt() ?? 0,
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.0,
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? 0.0,
      heightCm: (json['heightCm'] as num?)?.toDouble() ?? 0.0,
      oxygenSaturation: (json['oxygenSaturation'] as num?)?.toInt() ?? 0,
      allergies: json['allergies'] as String?,
      notes: json['notes'] as String?,
    );
  }

  double get bmi {
    if (heightCm <= 0) return 0.0;
    final heightM = heightCm / 100.0;
    return weightKg / (heightM * heightM);
  }

  String get bmiCategory {
    final val = bmi;
    if (val < 18.5) return 'Bajo peso';
    if (val < 25.0) return 'Normal';
    if (val < 30.0) return 'Sobrepeso';
    return 'Obesidad';
  }
}

class AppointmentReview {
  final String id;
  final int rating;
  final String? comment;
  final DateTime createdAt;

  AppointmentReview({
    required this.id,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  factory AppointmentReview.fromJson(Map<String, dynamic> json) {
    return AppointmentReview(
      id: json['id'] as String? ?? '',
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      comment: json['comment'] as String?,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

class Appointment {
  final String id;
  final String? patientId;
  final String? doctorId;
  final DateTime scheduledAt;
  final String status; // PENDING, CONFIRMED, COMPLETED, CANCELLED
  final String reason;
  final String? notes;
  final String paymentStatus; // UNPAID, PAID, REFUNDED
  final String? paymentMethod;
  final double? amountPaid;
  final DateTime? paidAt;
  final double consultationFee;
  final String doctorFullName;
  final String doctorSpecialty;
  final String? doctorLicenseNumber;
  final String? patientFullName;
  final Triage? triage;
  final AppointmentReview? review;

  Appointment({
    required this.id,
    this.patientId,
    this.doctorId,
    required this.scheduledAt,
    required this.status,
    required this.reason,
    this.notes,
    this.paymentStatus = 'UNPAID',
    this.paymentMethod,
    this.amountPaid,
    this.paidAt,
    this.consultationFee = 0.0,
    required this.doctorFullName,
    required this.doctorSpecialty,
    this.doctorLicenseNumber,
    this.patientFullName,
    this.triage,
    this.review,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    String docName = 'Médico Especialista';
    String docSpec = 'Medicina General';
    String? docLicense;
    double fee = 0.0;

    if (json['doctor'] != null && json['doctor'] is Map) {
      final docMap = json['doctor'] as Map<String, dynamic>;
      docLicense = docMap['licenseNumber'] as String?;
      fee = (docMap['consultationFee'] as num?)?.toDouble() ?? 0.0;

      if (docMap['user'] != null && docMap['user'] is Map) {
        docName = docMap['user']['fullName'] as String? ?? docName;
      } else if (docMap['fullName'] != null) {
        docName = docMap['fullName'] as String;
      }

      if (docMap['specialty'] != null) {
        if (docMap['specialty'] is Map) {
          docSpec = docMap['specialty']['name'] as String? ?? docSpec;
        } else if (docMap['specialty'] is String) {
          docSpec = docMap['specialty'] as String;
        }
      }
    }

    if (json['consultationFee'] != null && fee == 0.0) {
      fee = (json['consultationFee'] as num).toDouble();
    }

    String? patName;
    if (json['patient'] != null && json['patient'] is Map) {
      patName = json['patient']['fullName'] as String?;
    }

    Triage? triage;
    if (json['triage'] != null && json['triage'] is Map) {
      triage = Triage.fromJson(json['triage'] as Map<String, dynamic>);
    }

    AppointmentReview? review;
    if (json['review'] != null && json['review'] is Map) {
      review = AppointmentReview.fromJson(json['review'] as Map<String, dynamic>);
    }

    return Appointment(
      id: json['id'] as String? ?? '',
      patientId: json['patientId'] as String?,
      doctorId: json['doctorId'] as String?,
      scheduledAt: DateTime.tryParse(json['scheduledAt'].toString()) ??
          DateTime.now(),
      status: json['status'] as String? ?? 'PENDING',
      reason: json['reason'] as String? ?? '',
      notes: json['notes'] as String?,
      paymentStatus: json['paymentStatus'] as String? ?? 'UNPAID',
      paymentMethod: json['paymentMethod'] as String?,
      amountPaid: (json['amountPaid'] as num?)?.toDouble(),
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString())
          : null,
      consultationFee: fee,
      doctorFullName: docName,
      doctorSpecialty: docSpec,
      doctorLicenseNumber: docLicense,
      patientFullName: patName,
      triage: triage,
      review: review,
    );
  }

  bool get isPending => status == 'PENDING';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';
  bool get canBeCancelled => isPending || isConfirmed;

  bool get isPaid => paymentStatus == 'PAID';

  String get statusLabel {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'PENDING':
        return const Color(0xFFF59E0B); // Amber
      case 'CONFIRMED':
        return const Color(0xFF0284C7); // Sky Blue
      case 'COMPLETED':
        return const Color(0xFF10B981); // Emerald
      case 'CANCELLED':
        return const Color(0xFFEF4444); // Red
      default:
        return const Color(0xFF64748B);
    }
  }

  Color get statusBackgroundColor {
    switch (status) {
      case 'PENDING':
        return const Color(0xFFFEF3C7);
      case 'CONFIRMED':
        return const Color(0xFFE0F2FE);
      case 'COMPLETED':
        return const Color(0xFFD1FAE5);
      case 'CANCELLED':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFF1F5F9);
    }
  }

  String get formattedDateTime {
    final local = scheduledAt.toLocal();
    final formatter = DateFormat('EEE, d MMM yyyy - HH:mm', 'es');
    return formatter.format(local);
  }

  String get formattedTime {
    final local = scheduledAt.toLocal();
    return DateFormat('HH:mm').format(local);
  }

  String get formattedDate {
    final local = scheduledAt.toLocal();
    return DateFormat('d MMM yyyy', 'es').format(local);
  }
}
