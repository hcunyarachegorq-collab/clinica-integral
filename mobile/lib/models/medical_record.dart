import 'package:intl/intl.dart';

class MedicalAttachment {
  final String id;
  final String? medicalRecordId;
  final String fileName;
  final String fileType;
  final String fileDataUrl;
  final DateTime? createdAt;

  MedicalAttachment({
    required this.id,
    this.medicalRecordId,
    required this.fileName,
    required this.fileType,
    required this.fileDataUrl,
    this.createdAt,
  });

  factory MedicalAttachment.fromJson(Map<String, dynamic> json) {
    return MedicalAttachment(
      id: json['id'] as String? ?? '',
      medicalRecordId: json['medicalRecordId'] as String?,
      fileName: json['fileName'] as String? ?? 'adjunto',
      fileType: json['fileType'] as String? ?? 'application/octet-stream',
      fileDataUrl: json['fileDataUrl'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  bool get isPdf =>
      fileType.toLowerCase().contains('pdf') ||
      fileDataUrl.startsWith('data:application/pdf');

  bool get isImage =>
      fileType.toLowerCase().contains('image') ||
      fileDataUrl.startsWith('data:image');
}

class MedicalRecord {
  final String id;
  final String appointmentId;
  final String diagnosis;
  final String prescription;
  final String? notes;
  final DateTime createdAt;
  final String doctorFullName;
  final String doctorSpecialty;
  final String? doctorLicenseNumber;
  final String? patientFullName;
  final String? patientEmail;
  final String? patientPhone;
  final DateTime? appointmentDate;
  final String? appointmentReason;
  final List<MedicalAttachment> attachments;

  MedicalRecord({
    required this.id,
    required this.appointmentId,
    required this.diagnosis,
    required this.prescription,
    this.notes,
    required this.createdAt,
    required this.doctorFullName,
    required this.doctorSpecialty,
    this.doctorLicenseNumber,
    this.patientFullName,
    this.patientEmail,
    this.patientPhone,
    this.appointmentDate,
    this.appointmentReason,
    this.attachments = const [],
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) {
    String docName = 'Médico Especialista';
    String docSpec = 'Medicina General';
    String? docLicense;

    if (json['doctor'] != null && json['doctor'] is Map) {
      final docMap = json['doctor'] as Map<String, dynamic>;
      docLicense = docMap['licenseNumber'] as String?;

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

    String? patName;
    String? patEmail;
    String? patPhone;
    if (json['patient'] != null && json['patient'] is Map) {
      final patMap = json['patient'] as Map<String, dynamic>;
      patName = patMap['fullName'] as String?;
      patEmail = patMap['email'] as String?;
      patPhone = patMap['phone'] as String?;
    }

    DateTime? appDate;
    String? appReason;
    if (json['appointment'] != null && json['appointment'] is Map) {
      final appMap = json['appointment'] as Map<String, dynamic>;
      appReason = appMap['reason'] as String?;
      if (appMap['scheduledAt'] != null) {
        appDate = DateTime.tryParse(appMap['scheduledAt'].toString());
      }
    }

    final attachmentsList = <MedicalAttachment>[];
    if (json['attachments'] != null && json['attachments'] is List) {
      for (final a in json['attachments']) {
        if (a is Map<String, dynamic>) {
          attachmentsList.add(MedicalAttachment.fromJson(a));
        }
      }
    }

    return MedicalRecord(
      id: json['id'] as String? ?? '',
      appointmentId: json['appointmentId'] as String? ?? '',
      diagnosis: json['diagnosis'] as String? ?? '',
      prescription: json['prescription'] as String? ?? '',
      notes: json['notes'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now(),
      doctorFullName: docName,
      doctorSpecialty: docSpec,
      doctorLicenseNumber: docLicense,
      patientFullName: patName,
      patientEmail: patEmail,
      patientPhone: patPhone,
      appointmentDate: appDate,
      appointmentReason: appReason,
      attachments: attachmentsList,
    );
  }

  String get formattedDate {
    final local = createdAt.toLocal();
    return DateFormat('d MMMM yyyy - HH:mm', 'es').format(local);
  }
}
