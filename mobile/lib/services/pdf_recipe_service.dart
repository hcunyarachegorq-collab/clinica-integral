import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/medical_record.dart';

class PdfRecipeService {
  /// Genera el documento PDF en bytes para la receta médica
  static Future<Uint8List> generatePrescriptionPdf({
    required MedicalRecord record,
    String? patientNameFallback,
    String? patientEmailFallback,
    String? patientPhoneFallback,
  }) async {
    final pdf = pw.Document();

    pw.Font regularFont;
    pw.Font boldFont;
    pw.Font italicFont;

    try {
      regularFont = await PdfGoogleFonts.robotoRegular();
      boldFont = await PdfGoogleFonts.robotoBold();
      italicFont = await PdfGoogleFonts.robotoItalic();
    } catch (_) {
      regularFont = pw.Font.helvetica();
      boldFont = pw.Font.helveticaBold();
      italicFont = pw.Font.helveticaOblique();
    }

    final effectivePatientName = record.patientFullName ??
        patientNameFallback ??
        'Paciente de la Clínica';
    final effectivePatientEmail = record.patientEmail ??
        patientEmailFallback ??
        'No registrado';
    final effectivePatientPhone = record.patientPhone ??
        patientPhoneFallback ??
        'No registrado';

    final dateFormatted =
        DateFormat("d 'de' MMMM 'de' yyyy - HH:mm", 'es')
            .format(record.createdAt.toLocal());

    final folio = 'REC-${record.id.length >= 8 ? record.id.substring(0, 8).toUpperCase() : record.id.toUpperCase()}';

    final theme = pw.ThemeData.withFont(
      base: regularFont,
      bold: boldFont,
      italic: italicFont,
    );

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        theme: theme,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ENCABEZADO INSTITUCIONAL
              pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 12),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(
                    bottom: pw.BorderSide(
                      color: PdfColor.fromInt(0xFF0D9488), // Teal primary
                      width: 2.5,
                    ),
                  ),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'CLÍNICA MÉDICA INTEGRAL',
                          style: pw.TextStyle(
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: const PdfColor.fromInt(0xFF0F172A),
                          ),
                        ),
                        pw.SizedBox(height: 3),
                        pw.Text(
                          'Red de Atención Médica & Salud Ambulatoria Especializada',
                          style: const pw.TextStyle(
                            fontSize: 9,
                            color: PdfColor.fromInt(0xFF64748B),
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'Portal de Salud Digital • Tel: (01) 500-CLINICA',
                          style: const pw.TextStyle(
                            fontSize: 8,
                            color: PdfColor.fromInt(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: pw.BoxDecoration(
                        color: const PdfColor.fromInt(0xFFF0FDFA),
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(
                          color: const PdfColor.fromInt(0xFF99F6E4),
                        ),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.end,
                        children: [
                          pw.Text(
                            'RECETA MÉDICA OFICIAL',
                            style: pw.TextStyle(
                              fontSize: 9,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0D9488),
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            folio,
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 14),

              // DATOS DEL PACIENTE Y MÉDICO EN DOS COLUMNAS
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Columna Paciente
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: const PdfColor.fromInt(0xFFF8FAFC),
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(
                          color: const PdfColor.fromInt(0xFFE2E8F0),
                        ),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'DATOS DEL PACIENTE',
                            style: pw.TextStyle(
                              fontSize: 8,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0D9488),
                            ),
                          ),
                          pw.SizedBox(height: 4),
                          pw.Text(
                            effectivePatientName,
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0F172A),
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Correo: $effectivePatientEmail',
                            style: const pw.TextStyle(
                              fontSize: 8,
                              color: PdfColor.fromInt(0xFF475569),
                            ),
                          ),
                          pw.Text(
                            'Teléfono: $effectivePatientPhone',
                            style: const pw.TextStyle(
                              fontSize: 8,
                              color: PdfColor.fromInt(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  pw.SizedBox(width: 12),

                  // Columna Médico
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: const PdfColor.fromInt(0xFFF8FAFC),
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(
                          color: const PdfColor.fromInt(0xFFE2E8F0),
                        ),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'MÉDICO TRATANTE',
                            style: pw.TextStyle(
                              fontSize: 8,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0D9488),
                            ),
                          ),
                          pw.SizedBox(height: 4),
                          pw.Text(
                            'Dr(a). ${record.doctorFullName}',
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0F172A),
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Especialidad: ${record.doctorSpecialty}',
                            style: const pw.TextStyle(
                              fontSize: 8,
                              color: PdfColor.fromInt(0xFF475569),
                            ),
                          ),
                          pw.Text(
                            'Colegiatura / Reg.: ${record.doctorLicenseNumber ?? 'Válido MINSA'}',
                            style: const pw.TextStyle(
                              fontSize: 8,
                              color: PdfColor.fromInt(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 10),

              // FECHA Y MOTIVO DE CONSULTA
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: pw.BoxDecoration(
                  color: const PdfColor.fromInt(0xFFF1F5F9),
                  borderRadius: pw.BorderRadius.circular(4),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Fecha de Emisión: $dateFormatted',
                      style: const pw.TextStyle(
                        fontSize: 8,
                        color: PdfColor.fromInt(0xFF334155),
                      ),
                    ),
                    if (record.appointmentReason != null &&
                        record.appointmentReason!.isNotEmpty)
                      pw.Text(
                        'Motivo: ${record.appointmentReason!}',
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontStyle: pw.FontStyle.italic,
                          color: const PdfColor.fromInt(0xFF475569),
                        ),
                      ),
                  ],
                ),
              ),

              pw.SizedBox(height: 14),

              // DIAGNÓSTICO MÉDICO
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  color: const PdfColor.fromInt(0xFFF0FDF4),
                  borderRadius: pw.BorderRadius.circular(6),
                  border: pw.Border.all(
                    color: const PdfColor.fromInt(0xFFBBF7D0),
                  ),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'DIAGNÓSTICO CLÍNICO:',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                        color: const PdfColor.fromInt(0xFF15803D),
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      record.diagnosis,
                      style: pw.TextStyle(
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                        color: const PdfColor.fromInt(0xFF14532D),
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 14),

              // RECETA MÉDICA Y TRATAMIENTO (Rx)
              pw.Expanded(
                child: pw.Container(
                  width: double.infinity,
                  padding: const pw.EdgeInsets.all(14),
                  decoration: pw.BoxDecoration(
                    color: const PdfColor.fromInt(0xFFFAFAFA),
                    borderRadius: pw.BorderRadius.circular(6),
                    border: pw.Border.all(
                      color: const PdfColor.fromInt(0xFFE2E8F0),
                    ),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Row(
                        children: [
                          pw.Text(
                            'Rp. / PRESCRIPCIÓN FARMACOLÓGICA Y TRATAMIENTO (Rx)',
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        record.prescription,
                        style: const pw.TextStyle(
                          fontSize: 10,
                          lineSpacing: 3,
                          color: PdfColor.fromInt(0xFF1E293B),
                        ),
                      ),
                      if (record.prescriptionItems.isNotEmpty) ...[
                        pw.SizedBox(height: 10),
                        pw.Container(
                          width: double.infinity,
                          decoration: pw.BoxDecoration(
                            border: pw.Border.all(color: const PdfColor.fromInt(0xFFCBD5E1)),
                            borderRadius: pw.BorderRadius.circular(4),
                          ),
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                color: const PdfColor.fromInt(0xFFF1F5F9),
                                child: pw.Row(
                                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                                  children: [
                                    pw.Text(
                                      'MEDICAMENTOS FORMULADOS EN BOTICA INTERNA',
                                      style: pw.TextStyle(
                                        fontSize: 8,
                                        fontWeight: pw.FontWeight.bold,
                                        color: const PdfColor.fromInt(0xFF0F172A),
                                      ),
                                    ),
                                    pw.Text(
                                      record.pharmacyPaid ? 'PAGADO EN BOTICA' : 'PENDIENTE DE DESPACHO EN CAJA',
                                      style: pw.TextStyle(
                                        fontSize: 7,
                                        fontWeight: pw.FontWeight.bold,
                                        color: record.pharmacyPaid
                                            ? const PdfColor.fromInt(0xFF15803D)
                                            : const PdfColor.fromInt(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              pw.Padding(
                                padding: const pw.EdgeInsets.all(6),
                                child: pw.Table(
                                  columnWidths: {
                                    0: const pw.FlexColumnWidth(3),
                                    1: const pw.FlexColumnWidth(3),
                                    2: const pw.FlexColumnWidth(1),
                                    3: const pw.FlexColumnWidth(1.5),
                                  },
                                  children: [
                                    pw.TableRow(
                                      decoration: const pw.BoxDecoration(
                                        border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromInt(0xFFE2E8F0))),
                                      ),
                                      children: [
                                        pw.Padding(
                                          padding: const pw.EdgeInsets.only(bottom: 2),
                                          child: pw.Text('Medicamento', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                                        ),
                                        pw.Padding(
                                          padding: const pw.EdgeInsets.only(bottom: 2),
                                          child: pw.Text('Posología', style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                                        ),
                                        pw.Padding(
                                          padding: const pw.EdgeInsets.only(bottom: 2),
                                          child: pw.Text('Cant.', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                                        ),
                                        pw.Padding(
                                          padding: const pw.EdgeInsets.only(bottom: 2),
                                          child: pw.Text('Subtotal', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    ...record.prescriptionItems.map(
                                      (item) => pw.TableRow(
                                        children: [
                                          pw.Padding(
                                            padding: const pw.EdgeInsets.symmetric(vertical: 2),
                                            child: pw.Text('${item.medicationName} (${item.medicationPresentation})', style: const pw.TextStyle(fontSize: 7)),
                                          ),
                                          pw.Padding(
                                            padding: const pw.EdgeInsets.symmetric(vertical: 2),
                                            child: pw.Text(item.dosage, style: const pw.TextStyle(fontSize: 7)),
                                          ),
                                          pw.Padding(
                                            padding: const pw.EdgeInsets.symmetric(vertical: 2),
                                            child: pw.Text('${item.quantity}', textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 7)),
                                          ),
                                          pw.Padding(
                                            padding: const pw.EdgeInsets.symmetric(vertical: 2),
                                            child: pw.Text('S/ ${item.subtotal.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 7)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: const pw.BoxDecoration(
                                  border: pw.Border(top: pw.BorderSide(color: PdfColor.fromInt(0xFFE2E8F0))),
                                ),
                                child: pw.Row(
                                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                                  children: [
                                    pw.Text('Total Botica:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                                    pw.Text(
                                      'S/ ${record.pharmacyTotal.toStringAsFixed(2)}',
                                      style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: const PdfColor.fromInt(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (record.notes != null && record.notes!.isNotEmpty) ...[
                        pw.Divider(color: const PdfColor.fromInt(0xFFE2E8F0)),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          'Indicaciones Adicionales / Cuidados Generales:',
                          style: pw.TextStyle(
                            fontSize: 8,
                            fontWeight: pw.FontWeight.bold,
                            color: const PdfColor.fromInt(0xFF64748B),
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          record.notes!,
                          style: const pw.TextStyle(
                            fontSize: 8,
                            color: PdfColor.fromInt(0xFF334155),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              pw.SizedBox(height: 14),

              // PIE DE PÁGINA: FIRMA Y CERTIFICACIÓN
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Documento emitido electrónicamente con validez médico-legal.',
                        style: const pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromInt(0xFF94A3B8),
                        ),
                      ),
                      pw.Text(
                        'Consulte con su médico tratante ante cualquier reacción adversa.',
                        style: const pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromInt(0xFF94A3B8),
                        ),
                      ),
                      pw.Text(
                        'Clínica Médica Integral © 2026',
                        style: const pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromInt(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Container(
                        width: 140,
                        height: 1,
                        color: const PdfColor.fromInt(0xFF334155),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Dr(a). ${record.doctorFullName}',
                        style: pw.TextStyle(
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                          color: const PdfColor.fromInt(0xFF0F172A),
                        ),
                      ),
                      pw.Text(
                        record.doctorSpecialty,
                        style: const pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromInt(0xFF64748B),
                        ),
                      ),
                      if (record.doctorLicenseNumber != null)
                        pw.Text(
                          'Mat. ${record.doctorLicenseNumber}',
                          style: const pw.TextStyle(
                            fontSize: 7,
                            color: PdfColor.fromInt(0xFF64748B),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Abre el visor nativo de impresión / guardado en PDF
  static Future<void> printPrescription({
    required MedicalRecord record,
    String? patientNameFallback,
    String? patientEmailFallback,
    String? patientPhoneFallback,
  }) async {
    final folio =
        'Receta-${record.id.length >= 8 ? record.id.substring(0, 8).toUpperCase() : record.id.toUpperCase()}';

    await Printing.layoutPdf(
      name: folio,
      onLayout: (PdfPageFormat format) async {
        return generatePrescriptionPdf(
          record: record,
          patientNameFallback: patientNameFallback,
          patientEmailFallback: patientEmailFallback,
          patientPhoneFallback: patientPhoneFallback,
        );
      },
    );
  }
}
