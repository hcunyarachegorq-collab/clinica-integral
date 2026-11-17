import { Router, Response } from 'express';
import { z } from 'zod';
import { Role, PaymentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateJwt, authorizeRoles, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Esquema de validación para liquidación unificada
const settleBillingSchema = z.object({
  paymentMethod: z.enum(['EFECTIVO', 'YAPE_PLIN', 'TARJETA', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: 'Método de pago inválido. Opciones: EFECTIVO, YAPE_PLIN, TARJETA, TRANSFERENCIA' }),
  }),
  appointmentIds: z.array(z.string().uuid()).optional(),
  medicalRecordIds: z.array(z.string().uuid()).optional(),
  labOrderIds: z.array(z.string().uuid()).optional(),
  bedIds: z.array(z.string().uuid()).optional(),
});

// GET /api/billing/patient/:patientId/pending - Estado de cuenta consolidado
router.get(
  '/patient/:patientId/pending',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;

      const patient = await prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Paciente no encontrado.' });
      }

      // 1. Consultas pendientes de pago
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          patientId,
          paymentStatus: PaymentStatus.UNPAID,
          status: { not: 'CANCELLED' },
        },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      });

      // 2. Recetas de botica pendientes de pago
      const pendingMedicalRecords = await prisma.medicalRecord.findMany({
        where: {
          patientId,
          pharmacyTotal: { gt: 0 },
          pharmacyPaid: false,
        },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialty: { select: { name: true } },
            },
          },
          prescriptionItems: {
            include: {
              medication: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 3. Órdenes de laboratorio pendientes de pago
      const pendingLabOrders = await prisma.labOrder.findMany({
        where: {
          patientId,
          paid: false,
        },
        include: {
          catalogItem: true,
          doctor: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 4. Cargos de tópico / camillas de observación pendientes de pago
      const pendingBeds = await prisma.observationBed.findMany({
        where: {
          currentPatientId: patientId,
          fee: { gt: 0 },
          paid: false,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Construcción unificada de ítems
      const items: Array<{
        type: 'CONSULTATION' | 'PHARMACY' | 'LAB_ORDER' | 'TOPIC_BED';
        id: string;
        categoryName: string;
        description: string;
        amount: number;
        detail?: any;
      }> = [];

      let subtotalConsultations = 0;
      for (const app of pendingAppointments) {
        const fee = Number(app.doctor.consultationFee);
        subtotalConsultations += fee;
        items.push({
          type: 'CONSULTATION',
          id: app.id,
          categoryName: 'Consulta Médica',
          description: `Consulta con ${app.doctor.user.fullName} (${app.doctor.specialty.name})`,
          amount: fee,
          detail: {
            scheduledAt: app.scheduledAt,
            reason: app.reason,
            queueCode: app.queueCode,
          },
        });
      }

      let subtotalPharmacy = 0;
      for (const rec of pendingMedicalRecords) {
        subtotalPharmacy += rec.pharmacyTotal;
        const medNames = rec.prescriptionItems.map((p) => `${p.medication.name} (x${p.quantity})`).join(', ');
        items.push({
          type: 'PHARMACY',
          id: rec.id,
          categoryName: 'Botica Interna',
          description: `Receta Farmacológica: ${medNames || 'Medicamentos prescritos'}`,
          amount: rec.pharmacyTotal,
          detail: {
            date: rec.createdAt,
            items: rec.prescriptionItems.map((i) => ({
              name: i.medication.name,
              presentation: i.medication.presentation,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        });
      }

      let subtotalLab = 0;
      for (const lab of pendingLabOrders) {
        subtotalLab += lab.price;
        items.push({
          type: 'LAB_ORDER',
          id: lab.id,
          categoryName: `Examen: ${lab.catalogItem.category}`,
          description: `${lab.catalogItem.name} (${lab.catalogItem.code})`,
          amount: lab.price,
          detail: {
            date: lab.createdAt,
            doctorName: lab.doctor.user.fullName,
          },
        });
      }

      let subtotalTopic = 0;
      for (const bed of pendingBeds) {
        subtotalTopic += bed.fee;
        items.push({
          type: 'TOPIC_BED',
          id: bed.id,
          categoryName: 'Tópico y Observación',
          description: `${bed.name}: ${bed.procedure || bed.reason || 'Atención en box de urgencia'}`,
          amount: bed.fee,
          detail: {
            code: bed.code,
            procedure: bed.procedure,
          },
        });
      }

      const grandTotal = Number((subtotalConsultations + subtotalPharmacy + subtotalLab + subtotalTopic).toFixed(2));

      return res.status(200).json({
        patient,
        subtotals: {
          consultations: Number(subtotalConsultations.toFixed(2)),
          pharmacy: Number(subtotalPharmacy.toFixed(2)),
          lab: Number(subtotalLab.toFixed(2)),
          topic: Number(subtotalTopic.toFixed(2)),
        },
        grandTotal,
        itemsCount: items.length,
        items,
        counts: {
          appointments: pendingAppointments.length,
          prescriptions: pendingMedicalRecords.length,
          labOrders: pendingLabOrders.length,
          beds: pendingBeds.length,
        },
      });
    } catch (error: any) {
      console.error('Error al obtener estado de cuenta pendiente del paciente:', error);
      return res.status(500).json({ error: 'Error interno del servidor al consultar liquidación pendiente.' });
    }
  }
);

// POST /api/billing/patient/:patientId/settle - Liquidación y emisión de boleta unificada
router.post(
  '/patient/:patientId/settle',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const parseResult = settleBillingSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Datos de liquidación inválidos',
          details: parseResult.error.format(),
        });
      }

      const { paymentMethod, appointmentIds, medicalRecordIds, labOrderIds, bedIds } = parseResult.data;

      const patient = await prisma.user.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true, email: true, phone: true },
      });

      if (!patient) {
        return res.status(404).json({ error: 'El paciente especificado no existe.' });
      }

      const cashierName = req.user?.fullName || 'Caja Central';
      const cashierId = req.user?.id;

      // Mapear PaymentMethod para el modelo Appointment
      let appointmentPaymentMethod: PaymentMethod = PaymentMethod.CASH;
      if (paymentMethod === 'TARJETA') appointmentPaymentMethod = PaymentMethod.CARD;
      else if (paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'YAPE_PLIN') appointmentPaymentMethod = PaymentMethod.TRANSFER;

      // Transacción atómica en PostgreSQL
      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();

        // 1. Procesar Consultas
        const appWhere: any = {
          patientId,
          paymentStatus: PaymentStatus.UNPAID,
          status: { not: 'CANCELLED' },
        };
        if (appointmentIds && appointmentIds.length > 0) {
          appWhere.id = { in: appointmentIds };
        }

        const appointmentsToSettle = await tx.appointment.findMany({
          where: appWhere,
          include: {
            doctor: {
              include: {
                user: { select: { fullName: true } },
                specialty: { select: { name: true } },
              },
            },
          },
        });

        let consultationTotal = 0;
        const settledAppItems: any[] = [];
        for (const app of appointmentsToSettle) {
          const fee = Number(app.doctor.consultationFee);
          consultationTotal += fee;
          await tx.appointment.update({
            where: { id: app.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: appointmentPaymentMethod,
              amountPaid: fee,
              paidAt: now,
            },
          });
          settledAppItems.push({
            type: 'CONSULTATION',
            id: app.id,
            description: `Consulta Médica: ${app.doctor.user.fullName} (${app.doctor.specialty.name})`,
            amount: fee,
          });
        }

        // 2. Procesar Botica (Recetas y descuento de inventario)
        const medWhere: any = {
          patientId,
          pharmacyTotal: { gt: 0 },
          pharmacyPaid: false,
        };
        if (medicalRecordIds && medicalRecordIds.length > 0) {
          medWhere.id = { in: medicalRecordIds };
        }

        const recordsToSettle = await tx.medicalRecord.findMany({
          where: medWhere,
          include: {
            prescriptionItems: {
              include: { medication: true },
            },
          },
        });

        let pharmacyTotal = 0;
        const settledPharmacyItems: any[] = [];
        for (const record of recordsToSettle) {
          pharmacyTotal += record.pharmacyTotal;
          await tx.medicalRecord.update({
            where: { id: record.id },
            data: { pharmacyPaid: true },
          });

          // Descontar inventario de medicamentos
          for (const item of record.prescriptionItems) {
            await tx.medication.update({
              where: { id: item.medicationId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
            settledPharmacyItems.push({
              type: 'PHARMACY',
              id: item.id,
              description: `${item.medication.name} x ${item.quantity} (${item.dosage})`,
              amount: item.subtotal,
            });
          }
        }

        // 3. Procesar Órdenes de Laboratorio
        const labWhere: any = {
          patientId,
          paid: false,
        };
        if (labOrderIds && labOrderIds.length > 0) {
          labWhere.id = { in: labOrderIds };
        }

        const labsToSettle = await tx.labOrder.findMany({
          where: labWhere,
          include: { catalogItem: true },
        });

        let labTotal = 0;
        const settledLabItems: any[] = [];
        for (const lab of labsToSettle) {
          labTotal += lab.price;
          await tx.labOrder.update({
            where: { id: lab.id },
            data: { paid: true },
          });
          settledLabItems.push({
            type: 'LAB_ORDER',
            id: lab.id,
            description: `${lab.catalogItem.name} (${lab.catalogItem.category})`,
            amount: lab.price,
          });
        }

        // 4. Procesar Tópico y Camillas
        const bedWhere: any = {
          currentPatientId: patientId,
          fee: { gt: 0 },
          paid: false,
        };
        if (bedIds && bedIds.length > 0) {
          bedWhere.id = { in: bedIds };
        }

        const bedsToSettle = await tx.observationBed.findMany({
          where: bedWhere,
        });

        let topicTotal = 0;
        const settledBedItems: any[] = [];
        for (const bed of bedsToSettle) {
          topicTotal += bed.fee;
          await tx.observationBed.update({
            where: { id: bed.id },
            data: { paid: true },
          });
          settledBedItems.push({
            type: 'TOPIC_BED',
            id: bed.id,
            description: `${bed.name}: ${bed.procedure || 'Estadía y Procedimiento de Urgencias'}`,
            amount: bed.fee,
          });
        }

        const totalAmount = Number((consultationTotal + pharmacyTotal + labTotal + topicTotal).toFixed(2));
        if (totalAmount <= 0) {
          throw new Error('No hay cargos pendientes seleccionados para liquidar.');
        }

        // 5. Generar Correlativo de Boleta Hospitalaria Única (BOL-2026-XXXX)
        const totalReceipts = await tx.billingReceipt.count();
        const correlative = totalReceipts + 1;
        const receiptNumber = `BOL-2026-${String(correlative).padStart(4, '0')}`;

        const allItems = [
          ...settledAppItems,
          ...settledPharmacyItems,
          ...settledLabItems,
          ...settledBedItems,
        ];

        // 6. Registrar Comprobante de Liquidación
        const receipt = await tx.billingReceipt.create({
          data: {
            receiptNumber,
            patientId,
            patientName: patient.fullName,
            cashierId,
            cashierName,
            paymentMethod,
            totalAmount,
            consultationTotal: Number(consultationTotal.toFixed(2)),
            pharmacyTotal: Number(pharmacyTotal.toFixed(2)),
            labTotal: Number(labTotal.toFixed(2)),
            topicTotal: Number(topicTotal.toFixed(2)),
            itemsJson: JSON.stringify(allItems),
            createdAt: now,
          },
        });

        return {
          receipt,
          items: allItems,
          subtotals: {
            consultations: consultationTotal,
            pharmacy: pharmacyTotal,
            lab: labTotal,
            topic: topicTotal,
          },
          grandTotal: totalAmount,
        };
      });

      // Notificación automática al paciente
      try {
        await prisma.notification.create({
          data: {
            userId: patientId,
            title: 'Comprobante de Pago Emitido',
            message: `Se ha emitido tu boleta de pago ${result.receipt.receiptNumber} por un total de S/. ${result.grandTotal.toFixed(2)} (${paymentMethod}). ¡Gracias por atenderte en Clínica Integral!`,
            type: 'SYSTEM',
          },
        });
      } catch (notifErr) {
        console.error('Error al generar notificación de pago:', notifErr);
      }

      return res.status(200).json({
        message: 'Liquidación de caja completada exitosamente',
        receipt: {
          id: result.receipt.id,
          receiptNumber: result.receipt.receiptNumber,
          date: result.receipt.createdAt,
          patient: {
            id: patient.id,
            fullName: patient.fullName,
            email: patient.email,
            phone: patient.phone,
          },
          cashier: result.receipt.cashierName,
          paymentMethod: result.receipt.paymentMethod,
          items: result.items,
          subtotals: result.subtotals,
          grandTotal: result.grandTotal,
        },
      });
    } catch (error: any) {
      console.error('Error al liquidar cargos del paciente:', error);
      return res.status(400).json({
        error: error.message || 'Error al procesar la liquidación de caja.',
      });
    }
  }
);

// GET /api/billing/daily-close?date=YYYY-MM-DD - Arqueo de caja del día
router.get(
  '/daily-close',
  authenticateJwt,
  authorizeRoles(Role.ADMIN, Role.RECEPTIONIST),
  async (req: AuthRequest, res: Response) => {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const receipts = await prisma.billingReceipt.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let totalConsultations = 0;
      let totalPharmacy = 0;
      let totalLab = 0;
      let totalTopic = 0;
      let grandTotal = 0;

      const byPaymentMethod: Record<string, number> = {
        EFECTIVO: 0,
        YAPE_PLIN: 0,
        TARJETA: 0,
        TRANSFERENCIA: 0,
      };

      for (const r of receipts) {
        totalConsultations += r.consultationTotal;
        totalPharmacy += r.pharmacyTotal;
        totalLab += r.labTotal;
        totalTopic += r.topicTotal;
        grandTotal += r.totalAmount;

        const method = r.paymentMethod || 'EFECTIVO';
        byPaymentMethod[method] = (byPaymentMethod[method] || 0) + r.totalAmount;
      }

      return res.status(200).json({
        date: dateStr,
        receiptsCount: receipts.length,
        grandTotal: Number(grandTotal.toFixed(2)),
        byArea: {
          consultations: Number(totalConsultations.toFixed(2)),
          pharmacy: Number(totalPharmacy.toFixed(2)),
          lab: Number(totalLab.toFixed(2)),
          topic: Number(totalTopic.toFixed(2)),
        },
        byPaymentMethod: {
          EFECTIVO: Number((byPaymentMethod.EFECTIVO || 0).toFixed(2)),
          YAPE_PLIN: Number((byPaymentMethod.YAPE_PLIN || 0).toFixed(2)),
          TARJETA: Number((byPaymentMethod.TARJETA || 0).toFixed(2)),
          TRANSFERENCIA: Number((byPaymentMethod.TRANSFERENCIA || 0).toFixed(2)),
        },
        receipts: receipts.map((r) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          patientName: r.patientName,
          cashierName: r.cashierName,
          paymentMethod: r.paymentMethod,
          totalAmount: r.totalAmount,
          consultationTotal: r.consultationTotal,
          pharmacyTotal: r.pharmacyTotal,
          labTotal: r.labTotal,
          topicTotal: r.topicTotal,
          createdAt: r.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('Error al generar arqueo diario de caja:', error);
      return res.status(500).json({ error: 'Error interno del servidor al calcular arqueo de caja.' });
    }
  }
);

export default router;
