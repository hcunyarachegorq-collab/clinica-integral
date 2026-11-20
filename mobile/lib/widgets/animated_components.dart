import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
export 'motion_widgets.dart';

/// 1. FadeSlideEntry: Deslizamiento suave vertical + desvanecimiento escalonado
class FadeSlideEntry extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Duration delay;
  final double offsetY;
  final Curve curve;

  const FadeSlideEntry({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 380),
    this.delay = Duration.zero,
    this.offsetY = 22.0,
    this.curve = Curves.easeOutCubic,
  });

  @override
  State<FadeSlideEntry> createState() => _FadeSlideEntryState();
}

class _FadeSlideEntryState extends State<FadeSlideEntry>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _animation = CurvedAnimation(parent: _controller, curve: widget.curve);

    if (widget.delay > Duration.zero) {
      Future.delayed(widget.delay, () {
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
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(0, (1.0 - _animation.value) * widget.offsetY),
            child: widget.child,
          ),
        );
      },
    );
  }
}

/// 2. BouncyButton / ScaleTap: Micro-interacción táctil elástica con HapticFeedback
class BouncyButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scaleFactor;
  final Duration duration;
  final HitTestBehavior behavior;

  const BouncyButton({
    super.key,
    required this.child,
    this.onTap,
    this.scaleFactor = 0.96,
    this.duration = const Duration(milliseconds: 90),
    this.behavior = HitTestBehavior.opaque,
  });

  @override
  State<BouncyButton> createState() => _BouncyButtonState();
}

class _BouncyButtonState extends State<BouncyButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _scaleAnimation = Tween<double>(begin: 1.0, end: widget.scaleFactor).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null) {
      HapticFeedback.lightImpact();
      _controller.forward();
    }
  }

  void _onTapUp(TapUpDetails details) {
    if (widget.onTap != null) {
      _controller.reverse();
      widget.onTap!();
    }
  }

  void _onTapCancel() {
    if (widget.onTap != null) {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: widget.behavior,
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}

/// 3. ShimmerPlaceholder: Esqueletos de carga con gradiente deslizante continuo
class ShimmerLoading extends StatefulWidget {
  final Widget child;
  final Color baseColor;
  final Color highlightColor;
  final Duration duration;

  const ShimmerLoading({
    super.key,
    required this.child,
    this.baseColor = const Color(0xFFE2E8F0),
    this.highlightColor = const Color(0xFFF8FAFC),
    this.duration = const Duration(milliseconds: 1400),
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..repeat();
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
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: const Alignment(-1.0, -0.3),
              end: const Alignment(1.0, 0.3),
              stops: const [0.0, 0.5, 1.0],
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              transform: _SlidingGradientTransform(slidePercent: _controller.value),
            ).createShader(bounds);
          },
          child: widget.child,
        );
      },
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double slidePercent;
  const _SlidingGradientTransform({required this.slidePercent});

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * (slidePercent * 2 - 1), 0.0, 0.0);
  }
}

/// Caja rectangular/redondeada base para Shimmer
class ShimmerBox extends StatelessWidget {
  final double? width;
  final double height;
  final double borderRadius;

  const ShimmerBox({
    super.key,
    this.width,
    required this.height,
    this.borderRadius = 8.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Esqueleto animado de Tarjeta de Doctor
class ShimmerDoctorCard extends StatelessWidget {
  const ShimmerDoctorCard({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const ShimmerBox(width: 52, height: 52, borderRadius: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        ShimmerBox(width: 160, height: 16, borderRadius: 6),
                        SizedBox(height: 6),
                        ShimmerBox(width: 100, height: 12, borderRadius: 4),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const ShimmerBox(height: 38, borderRadius: 10),
              const SizedBox(height: 12),
              const ShimmerBox(height: 42, borderRadius: 12),
            ],
          ),
        ),
      ),
    );
  }
}

/// Esqueleto animado de Tarjeta de Cita
class ShimmerAppointmentCard extends StatelessWidget {
  const ShimmerAppointmentCard({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  ShimmerBox(width: 120, height: 18, borderRadius: 6),
                  ShimmerBox(width: 75, height: 22, borderRadius: 12),
                ],
              ),
              const SizedBox(height: 12),
              const ShimmerBox(width: 180, height: 14, borderRadius: 4),
              const SizedBox(height: 8),
              const ShimmerBox(height: 36, borderRadius: 8),
            ],
          ),
        ),
      ),
    );
  }
}

/// 4. LivePulseBadge: Indicador activo con ondas de pulso continuas
class LivePulseBadge extends StatefulWidget {
  final String label;
  final Color color;
  final double fontSize;

  const LivePulseBadge({
    super.key,
    required this.label,
    this.color = const Color(0xFF10B981),
    this.fontSize = 11.0,
  });

  @override
  State<LivePulseBadge> createState() => _LivePulseBadgeState();
}

class _LivePulseBadgeState extends State<LivePulseBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    _scaleAnimation = Tween<double>(begin: 0.9, end: 2.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutQuad),
    );

    _fadeAnimation = Tween<double>(begin: 0.7, end: 0.0).animate(
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
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
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
        Text(
          widget.label,
          style: TextStyle(
            fontSize: widget.fontSize,
            fontWeight: FontWeight.w600,
            color: widget.color,
          ),
        ),
      ],
    );
  }
}

/// 5. SlideFadePageRoute: Transición de ruta fluida con fade + slide lateral sutil
class SlideFadePageRoute<T> extends PageRouteBuilder<T> {
  final Widget page;

  SlideFadePageRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
              reverseCurve: Curves.easeInCubic,
            );
            return FadeTransition(
              opacity: curved,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.06, 0.0),
                  end: Offset.zero,
                ).animate(curved),
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
          reverseTransitionDuration: const Duration(milliseconds: 240),
        );
}
