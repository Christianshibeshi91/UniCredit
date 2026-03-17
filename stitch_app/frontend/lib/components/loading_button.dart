import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

/// A button with built-in loading state that prevents double-submit.
/// When [isLoading] is true, shows a spinner and disables taps.
class LoadingButton extends StatefulWidget {
  final String label;
  final VoidCallback onPressed;
  final bool isLoading;
  final bool enabled;
  final List<Color>? gradient;
  final Color? backgroundColor;
  final Color textColor;
  final IconData? icon;
  final double height;
  final double borderRadius;
  final bool fullWidth;

  const LoadingButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.enabled = true,
    this.gradient,
    this.backgroundColor,
    this.textColor = Colors.white,
    this.icon,
    this.height = AppSizes.buttonHeight,
    this.borderRadius = AppRadius.button,
    this.fullWidth = true,
  });

  /// Convenience constructor for primary gradient button.
  const LoadingButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.enabled = true,
    this.icon,
    this.height = AppSizes.buttonHeight,
    this.borderRadius = AppRadius.button,
    this.fullWidth = true,
  })  : gradient = AppColors.primaryGradient,
        backgroundColor = null,
        textColor = Colors.white;

  /// Convenience constructor for accent/warm button.
  const LoadingButton.accent({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.enabled = true,
    this.icon,
    this.height = AppSizes.buttonHeight,
    this.borderRadius = AppRadius.button,
    this.fullWidth = true,
  })  : gradient = AppColors.warmGradient,
        backgroundColor = null,
        textColor = Colors.white;

  @override
  State<LoadingButton> createState() => _LoadingButtonState();
}

class _LoadingButtonState extends State<LoadingButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _scaleCtrl;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleCtrl.dispose();
    super.dispose();
  }

  bool get _canPress => widget.enabled && !widget.isLoading;

  void _onTapDown(TapDownDetails _) {
    if (!_canPress) return;
    _scaleCtrl.forward();
  }

  void _onTapUp(TapUpDetails _) {
    if (!_canPress) return;
    _scaleCtrl.reverse();
  }

  void _onTapCancel() {
    _scaleCtrl.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final gradient = widget.gradient;
    final bgColor = widget.backgroundColor ?? AppColors.primary;
    final disabledOpacity = _canPress ? 1.0 : 0.5;

    return AnimatedBuilder(
      animation: _scaleAnim,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnim.value,
          child: GestureDetector(
            onTapDown: _onTapDown,
            onTapUp: _onTapUp,
            onTapCancel: _onTapCancel,
            onTap: _canPress ? widget.onPressed : null,
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: disabledOpacity,
              child: Container(
                width: widget.fullWidth ? double.infinity : null,
                height: widget.height,
                decoration: BoxDecoration(
                  gradient: gradient != null
                      ? LinearGradient(colors: gradient)
                      : null,
                  color: gradient == null ? bgColor : null,
                  borderRadius: BorderRadius.circular(widget.borderRadius),
                  boxShadow: _canPress
                      ? [
                          BoxShadow(
                            color: (gradient != null
                                    ? gradient.first
                                    : bgColor)
                                .withValues(alpha: 0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: widget.isLoading
                      ? SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: widget.textColor,
                            strokeWidth: 2.5,
                          ),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.icon != null) ...[
                              Icon(widget.icon,
                                  color: widget.textColor, size: 20),
                              const SizedBox(width: 8),
                            ],
                            Text(
                              widget.label,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: widget.textColor,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Animated builder helper.
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext, Widget?) builder;

  const AnimatedBuilder({
    super.key,
    required Animation<double> animation,
    required this.builder,
  }) : super(listenable: animation);

  @override
  Widget build(BuildContext context) {
    return builder(context, null);
  }
}
