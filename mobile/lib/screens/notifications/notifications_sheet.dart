import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../models/notification_item.dart';

class NotificationsSheet extends StatefulWidget {
  final VoidCallback? onNotificationsUpdated;

  const NotificationsSheet({super.key, this.onNotificationsUpdated});

  static Future<void> show(BuildContext context, {VoidCallback? onUpdated}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NotificationsSheet(onNotificationsUpdated: onUpdated),
    );
  }

  @override
  State<NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<NotificationsSheet> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  List<NotificationItem> _notifications = [];
  int _unreadCount = 0;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.get('/api/notifications');
      if (res is Map<String, dynamic>) {
        final list = (res['notifications'] as List? ?? [])
            .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
            .toList();
        final count = (res['unreadCount'] as num?)?.toInt() ?? 0;

        if (mounted) {
          setState(() {
            _notifications = list;
            _unreadCount = count;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'No se pudieron cargar las notificaciones';
        });
      }
    }
  }

  Future<void> _markAsRead(NotificationItem notif) async {
    if (notif.isRead) return;

    try {
      await _apiClient.patch('/api/notifications/${notif.id}/read');
      if (mounted) {
        setState(() {
          _notifications = _notifications.map((n) {
            if (n.id == notif.id) {
              return n.copyWith(isRead: true);
            }
            return n;
          }).toList();
          _unreadCount = (_unreadCount - 1).clamp(0, 999);
        });
        widget.onNotificationsUpdated?.call();
      }
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await _apiClient.patch('/api/notifications/read-all');
      if (mounted) {
        setState(() {
          _notifications =
              _notifications.map((n) => n.copyWith(isRead: true)).toList();
          _unreadCount = 0;
        });
        widget.onNotificationsUpdated?.call();
      }
    } catch (_) {}
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'APPOINTMENT':
        return Icons.calendar_month_rounded;
      case 'MEDICAL_RECORD':
        return Icons.medical_services_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'APPOINTMENT':
        return AppTheme.primary;
      case 'MEDICAL_RECORD':
        return AppTheme.success;
      default:
        return AppTheme.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.82,
      ),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: AppTheme.border),
          left: BorderSide(color: AppTheme.border),
          right: BorderSide(color: AppTheme.border),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.notifications_outlined,
                    color: AppTheme.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Notificaciones',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          if (_unreadCount > 0) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.error,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$_unreadCount',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const Text(
                        'Avisos de citas y recetas médicas',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_unreadCount > 0)
                  TextButton(
                    onPressed: _markAllAsRead,
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                    ),
                    child: const Text(
                      'Marcar leídas',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ),

          const Divider(color: AppTheme.border, height: 1),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppTheme.primary,
                    ),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: AppTheme.error,
                              size: 40,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _errorMessage!,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton(
                              onPressed: _fetchNotifications,
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      )
                    : _notifications.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(20),
                                    decoration: BoxDecoration(
                                      color: AppTheme.background,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: AppTheme.border,
                                      ),
                                    ),
                                    child: Icon(
                                      Icons.notifications_none_rounded,
                                      color: AppTheme.textSecondary.withAlpha(150),
                                      size: 48,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No tienes notificaciones',
                                    style: TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Te avisaremos cuando tu cita sea confirmada, atendida o tengas recetas listas.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            itemCount: _notifications.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final notif = _notifications[index];
                              final color = _getColorForType(notif.type);
                              final icon = _getIconForType(notif.type);
                              final dateStr = DateFormat(
                                'dd MMM, hh:mm a',
                                'es',
                              ).format(notif.createdAt);

                              return InkWell(
                                onTap: () => _markAsRead(notif),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: notif.isRead
                                        ? AppTheme.background
                                        : color.withAlpha(15),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: notif.isRead
                                          ? AppTheme.border
                                          : color.withAlpha(90),
                                    ),
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: color.withAlpha(25),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          icon,
                                          color: color,
                                          size: 18,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    notif.title,
                                                    style: TextStyle(
                                                      color: notif.isRead
                                                          ? AppTheme.textSecondary
                                                          : AppTheme.textPrimary,
                                                      fontWeight: notif.isRead
                                                          ? FontWeight.w600
                                                          : FontWeight.bold,
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                Text(
                                                  dateStr,
                                                  style: TextStyle(
                                                    color: AppTheme.textSecondary
                                                        .withAlpha(160),
                                                    fontSize: 10,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              notif.message,
                                              style: TextStyle(
                                                color: notif.isRead
                                                    ? AppTheme.textSecondary
                                                    : AppTheme.textPrimary,
                                                fontSize: 12,
                                                height: 1.3,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (!notif.isRead) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: BoxDecoration(
                                            color: color,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
