import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// =========================================================================
/// 1. STAGGERED SLIDE FADE: Animación escalonada de entrada (desplazamiento vertical + opacidad)
/// =========================================================================
class StaggeredSlideFade extends StatefulWidget {
  final Widget child;
  final int index;
  final Duration duration;
  final Duration stepDelay;
  final Offset offset;
  final Curve curve;

  const StaggeredSlideFade({
    super.key,
    required this.child,
    this.index = 0,
    this.duration = const Duration(milliseconds: 400),
    this.stepDelay = const Duration(milliseconds: 55),
    this.offset = const Offset(0, 24),
    this.curve = Curves.easeOutCubic,
  });

  @override
  State<StaggeredSlideFade> createState() => _StaggeredSlideFadeState();
}

class _StaggeredSlideFadeState extends State<StaggeredSlideFade>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);

    final curved = CurvedAnimation(parent: _controller, curve: widget.curve);
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(curved);
    _slideAnimation = Tween<Offset>(begin: widget.offset, end: Offset.zero).animate(curved);

    final totalDelay = widget.stepDelay * widget.index;
    if (totalDelay > Duration.zero) {
      Future.delayed(totalDelay, () {
        if (!_disposed && mounted) {
          _controller.forward();
        }
      });
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: _slideAnimation.value,
            child: widget.child,
          ),
        );
      },
    );
  }
}

/// =========================================================================
/// 2. ANIMATED COUNTER: Contador numérico animado suave de 0 al valor final
/// =========================================================================
class AnimatedCounter extends StatelessWidget {
  final int value;
  final TextStyle? style;
  final Duration duration;
  final Curve curve;
  final String prefix;
  final String suffix;

  const AnimatedCounter({
    super.key,
    required this.value,
    this.style,
    this.duration = const Duration(milliseconds: 700),
    this.curve = Curves.easeOutCubic,
    this.prefix = '',
    this.suffix = '',
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: duration,
      curve: curve,
      builder: (context, val, child) {
        return Text(
          '$prefix$val$suffix',
          style: style,
        );
      },
    );
  }
}

/// =========================================================================
/// 3. PULSE BADGE: Badge con anillo de radar pulsante continuo para estados en vivo
/// =========================================================================
class PulseBadge extends StatefulWidget {
  final String label;
  final Color color;
  final Color? backgroundColor;
  final IconData? icon;
  final double fontSize;
  final bool animateRing;

  const PulseBadge({
    super.key,
    required this.label,
    this.color = const Color(0xFF10B981),
    this.backgroundColor,
    this.icon,
    this.fontSize = 11.0,
    this.animateRing = true,
  });

  @override
  State<PulseBadge> createState() => _PulseBadgeState();
}

class _PulseBadgeState extends State<PulseBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    if (widget.animateRing) {
      _controller.repeat();
    }

    _scaleAnimation = Tween<double>(begin: 0.9, end: 2.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );

    _fadeAnimation = Tween<double>(begin: 0.75, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = widget.backgroundColor ?? widget.color.withValues(alpha: 0.12);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: widget.color.withValues(alpha: 0.28)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              if (widget.animateRing)
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return Opacity(
                      opacity: _fadeAnimation.value,
                      child: Transform.scale(
                        scale: _scaleAnimation.value,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: widget.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          const SizedBox(width: 6),
          if (widget.icon != null) ...[
            Icon(widget.icon, size: widget.fontSize + 2, color: widget.color),
            const SizedBox(width: 4),
          ],
          Text(
            widget.label,
            style: TextStyle(
              fontSize: widget.fontSize,
              fontWeight: FontWeight.bold,
              color: widget.color,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// =========================================================================
/// 4. SHIMMER SKELETON: Tarjetas de carga con gradiente deslizante suave
/// =========================================================================
class ShimmerSkeleton extends StatefulWidget {
  final double? width;
  final double height;
  final double borderRadius;
  final Color baseColor;
  final Color highlightColor;

  const ShimmerSkeleton({
    super.key,
    this.width,
    required this.height,
    this.borderRadius = 12.0,
    this.baseColor = const Color(0xFFE2E8F0),
    this.highlightColor = const Color(0xFFF8FAFC),
  });

  /// Tarjeta rectangular completa para listas
  static Widget card({
    double height = 110,
    double borderRadius = 16,
    EdgeInsetsGeometry margin = const EdgeInsets.only(bottom: 12),
  }) {
    return Container(
      margin: margin,
      child: ShimmerSkeleton(
        width: double.infinity,
        height: height,
        borderRadius: borderRadius,
      ),
    );
  }

  /// Lista de tarjetas esqueleto
  static Widget list({
    int count = 4,
    double itemHeight = 110,
    EdgeInsetsGeometry padding = const EdgeInsets.all(16),
  }) {
    return ListView.builder(
      padding: padding,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      itemBuilder: (context, index) => card(height: itemHeight),
    );
  }

  @override
  State<ShimmerSkeleton> createState() => _ShimmerSkeletonState();
}

class _ShimmerSkeletonState extends State<ShimmerSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(-1.5 + _controller.value * 3.0, -0.3),
              end: Alignment(-0.5 + _controller.value * 3.0, 0.3),
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
            ),
          ),
        );
      },
    );
  }
}

/// =========================================================================
/// 5. FLOATING PILL NAVBAR: Barra de navegación inferior flotante con indicador activo
/// =========================================================================
class FloatingPillNavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final Color? activeColor;

  const FloatingPillNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.activeColor,
  });
}

class FloatingPillNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<FloatingPillNavItem> items;
  final Color activeColor;
  final Color inactiveColor;
  final Color backgroundColor;

  const FloatingPillNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.activeColor = const Color(0xFF0284C7),
    this.inactiveColor = const Color(0xFF64748B),
    this.backgroundColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
              blurRadius: 22,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: activeColor.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(items.length, (index) {
            final isSelected = index == currentIndex;
            final item = items[index];
            final color = item.activeColor ?? activeColor;

            return Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (!isSelected) {
                    HapticFeedback.selectionClick();
                    onTap(index);
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  padding: EdgeInsets.symmetric(
                    horizontal: isSelected ? 12 : 6,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? color.withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSelected ? item.selectedIcon : item.icon,
                        color: isSelected ? color : inactiveColor,
                        size: 22,
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            item.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

/// =========================================================================
/// 6. SUCCESS CONFIRMATION MODAL: Check animado elástico + HapticFeedback
/// =========================================================================
class BookingSuccessDialog extends StatefulWidget {
  final String doctorName;
  final String dateFormatted;
  final String timeFormatted;
  final String feeFormatted;
  final VoidCallback onDismiss;

  const BookingSuccessDialog({
    super.key,
    required this.doctorName,
    required this.dateFormatted,
    required this.timeFormatted,
    required this.feeFormatted,
    required this.onDismiss,
  });

  static Future<void> show({
    required BuildContext context,
    required String doctorName,
    required String dateFormatted,
    required String timeFormatted,
    required String feeFormatted,
    required VoidCallback onDismiss,
  }) {
    HapticFeedback.heavyImpact();
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BookingSuccessDialog(
        doctorName: doctorName,
        dateFormatted: dateFormatted,
        timeFormatted: timeFormatted,
        feeFormatted: feeFormatted,
        onDismiss: onDismiss,
      ),
    );
  }

  @override
  State<BookingSuccessDialog> createState() => _BookingSuccessDialogState();
}

class _BookingSuccessDialogState extends State<BookingSuccessDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _checkAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _checkAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.3, 1.0, curve: Curves.easeOutBack)),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      elevation: 16,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Círculo animado elástico con check
            ScaleTransition(
              scale: _scaleAnimation,
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0D9488), Color(0xFF0284C7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D9488).withValues(alpha: 0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ScaleTransition(
                  scale: _checkAnimation,
                  child: const Icon(
                    Icons.check_rounded,
                    color: Colors.white,
                    size: 44,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              '¡Cita Agendada con Éxito!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Tu consulta con el especialista ha sido registrada en el sistema clínico.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: const Color(0xFF64748B),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 18),

            // Resumen de la Cita
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDFA),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFCCFBF1)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person_outline_rounded, size: 16, color: Color(0xFF0F766E)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.doctorName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F766E)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 15, color: Color(0xFF0284C7)),
                      const SizedBox(width: 8),
                      Text(
                        'Fecha: ${widget.dateFormatted}',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF0369A1)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 15, color: Color(0xFF0284C7)),
                      const SizedBox(width: 8),
                      Text(
                        'Hora: ${widget.timeFormatted}',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Color(0xFF0369A1)),
                      ),
                      const Spacer(),
                      Text(
                        widget.feeFormatted,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F766E)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                onPressed: () {
                  Navigator.of(context).pop();
                  widget.onDismiss();
                },
                child: const Text(
                  'Ver Mis Citas',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
